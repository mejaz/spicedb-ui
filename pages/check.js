import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';

const initial = { resourceType: '', resourceId: '', permission: '', subjectType: '', subjectId: '', subjectRelation: '', context: '', consistency: 'minimize' };

export default function AuthorizationWorkbench() {
  const [definitions, setDefinitions] = useState([]);
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState('check');
  const [bulkSubjects, setBulkSubjects] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/spicedb/resources').then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setDefinitions(data.resourceTypes || []);
      const first = data.resourceTypes?.[0];
      setForm((current) => ({ ...current, resourceType: first?.name || '', permission: first?.permissions?.[0]?.name || '' }));
    }).catch((failure) => setError(failure.message || 'Unable to load schema suggestions'));
  }, []);

  const definition = useMemo(() => definitions.find((item) => item.name === form.resourceType), [definitions, form.resourceType]);
  const updateType = (resourceType) => {
    const selected = definitions.find((item) => item.name === resourceType);
    setForm({ ...form, resourceType, permission: selected?.permissions?.[0]?.name || '' });
  };

  const execute = async () => {
    setLoading(true); setError(''); setResult(null);
    const started = performance.now();
    try {
      const context = parseContext(form.context);
      const common = {
        resource: objectRef(form.resourceType, form.resourceId), permission: form.permission,
        ...(context ? { context } : {}), consistency: consistency(form.consistency),
      };
      let endpoint; let body;
      if (tab === 'check') {
        endpoint = '/api/spicedb/check';
        body = { ...common, subject: subjectRef(form.subjectType, form.subjectId, form.subjectRelation) };
      } else if (tab === 'bulk') {
        endpoint = '/api/spicedb/check-bulk';
        const subjects = bulkSubjects.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        if (subjects.length > 50) throw new Error('Bulk checks are limited to 50 subjects');
        body = { requests: subjects.map((value) => ({ ...common, subject: parseSubject(value) })) };
      } else if (tab === 'expand') {
        endpoint = '/api/spicedb/expand'; body = common;
      } else {
        endpoint = '/api/spicedb/lookup-subjects'; body = { ...common, subjectObjectType: form.subjectType };
      }
      validate(tab, form, bulkSubjects);
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Authorization request failed');
      const completed = { type: tab, data, durationMs: Math.round((performance.now() - started) * 10) / 10, at: new Date().toISOString(), query: queryLabel(tab, form, bulkSubjects) };
      setResult(completed); setHistory((items) => [completed, ...items].slice(0, 20));
    } catch (failure) { setError(failure.message || 'Authorization request failed'); }
    finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <section><h2 className="text-2xl font-bold">Authorization workbench</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Every result below comes from the configured SpiceDB instance.</p></section>
        {error && <div role="alert" className="alert-error">{error}</div>}
        <div className="border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Authorization operations"><div className="flex gap-5 overflow-x-auto">{[['check','Check'],['bulk','Bulk check'],['expand','Expand'],['lookup','Lookup subjects']].map(([value,label]) => <button type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setResult(null); setError(''); }} key={value} className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${tab === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>{label}</button>)}</div></div>

        <section className="card p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Resource type"><select className="input" value={form.resourceType} onChange={(event) => updateType(event.target.value)}>{definitions.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field>
            <Field label="Resource ID"><input className="input" value={form.resourceId} onChange={(event) => setForm({ ...form, resourceId: event.target.value })} placeholder="Exact object ID" /></Field>
            <Field label="Permission"><select className="input" value={form.permission} onChange={(event) => setForm({ ...form, permission: event.target.value })}><option value="">Choose permission</option>{definition?.permissions.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field>
            {tab !== 'expand' && <Field label={tab === 'lookup' ? 'Subject type' : 'Subject type'}><select className="input" value={form.subjectType} onChange={(event) => setForm({ ...form, subjectType: event.target.value })}><option value="">Choose type</option>{definitions.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field>}
            {tab === 'check' && <><Field label="Subject ID"><input className="input" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} /></Field><Field label="Subject relation (optional)"><input className="input" value={form.subjectRelation} onChange={(event) => setForm({ ...form, subjectRelation: event.target.value })} placeholder="e.g. member" /></Field></>}
            {tab === 'bulk' && <div className="sm:col-span-2 lg:col-span-3"><Field label="Subjects — one type:id or type:id#relation per line (maximum 50)"><textarea className="input min-h-32 font-mono" value={bulkSubjects} onChange={(event) => setBulkSubjects(event.target.value)} placeholder={'user:alice\nuser:bob\ngroup:admins#member'} /></Field></div>}
            <Field label="Consistency"><select className="input" value={form.consistency} onChange={(event) => setForm({ ...form, consistency: event.target.value })}><option value="minimize">Minimize latency</option><option value="full">Fully consistent</option></select></Field>
            <div className="sm:col-span-2"><Field label="Caveat context (JSON object, optional)"><textarea className="input min-h-24 font-mono" value={form.context} onChange={(event) => setForm({ ...form, context: event.target.value })} placeholder='{"current_time":"2026-07-16T12:00:00Z"}' /></Field></div>
          </div>
          <div className="mt-5 flex items-center gap-3"><button className="btn-primary" type="button" disabled={loading} onClick={execute}>{loading ? 'Running…' : operationLabel(tab)}</button><span className="text-xs text-gray-500">Results are not cached.</span></div>
        </section>

        {result && <ResultCard result={result} />}

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700"><h2 className="font-semibold">Session history</h2>{history.length > 0 && <button className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white" type="button" onClick={() => setHistory([])}>Clear</button>}</div>
          {!history.length ? <div className="p-8 text-center text-gray-500">No authorization requests in this browser session.</div> : <ul className="divide-y divide-gray-200 dark:divide-gray-700">{history.map((item, index) => <li key={`${item.at}-${index}`} className="flex flex-col justify-between gap-2 px-5 py-3 sm:flex-row"><div><code className="break-all text-sm">{item.query}</code><p className="mt-1 text-xs text-gray-500">{new Date(item.at).toLocaleTimeString()}</p></div><span className="text-sm text-gray-500">{item.durationMs} ms</span></li>)}</ul>}
        </section>
      </div>
    </Layout>
  );
}

function ResultCard({ result }) {
  const permissionship = result.type === 'check' ? result.data.permissionship : null;
  const missing = result.data.partialCaveatInfo?.missingRequiredContext || [];
  return <section className="card overflow-hidden" aria-live="polite"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700"><div><h2 className="font-semibold">Live result</h2><code className="text-xs text-gray-500">{result.query}</code></div><div className="flex items-center gap-2">{permissionship && <span className={`rounded-full px-3 py-1 text-sm font-semibold ${permissionColor(permissionship)}`}>{permissionLabel(permissionship)}</span>}<span className="text-sm text-gray-500">{result.durationMs} ms</span><button className="btn-small" type="button" onClick={() => navigator.clipboard.writeText(JSON.stringify(result.data, null, 2))}>Copy JSON</button></div></header>{missing.length > 0 && <div className="alert-warning m-5">Conditional result. Missing caveat context: {missing.join(', ')}</div>}<pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap p-5 text-xs">{JSON.stringify(result.data, null, 2)}</pre></section>;
}
function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label>; }
function objectRef(objectType, objectId) { return { objectType: objectType.trim(), objectId: objectId.trim() }; }
function subjectRef(type, id, relation) { return { object: objectRef(type, id), ...(relation.trim() ? { optionalRelation: relation.trim() } : {}) }; }
function parseSubject(value) { const colon = value.indexOf(':'); if (colon < 1) throw new Error(`Invalid subject: ${value}`); const type = value.slice(0, colon); const remainder = value.slice(colon + 1); const hash = remainder.lastIndexOf('#'); return subjectRef(type, hash > 0 ? remainder.slice(0, hash) : remainder, hash > 0 ? remainder.slice(hash + 1) : ''); }
function parseContext(value) { if (!value.trim()) return null; const parsed = JSON.parse(value); if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Caveat context must be a JSON object'); return parsed; }
function consistency(value) { return value === 'full' ? { fullyConsistent: true } : { minimizeLatency: true }; }
function validate(tab, form, bulk) { if (!form.resourceType || !form.resourceId || !form.permission) throw new Error('Resource type, resource ID and permission are required'); if (tab === 'check' && (!form.subjectType || !form.subjectId)) throw new Error('Subject type and subject ID are required'); if (tab === 'lookup' && !form.subjectType) throw new Error('Subject type is required'); if (tab === 'bulk' && !bulk.trim()) throw new Error('Enter at least one subject'); }
function operationLabel(tab) { return ({ check: 'Check permission', bulk: 'Run real bulk checks', expand: 'Expand permission', lookup: 'Lookup subjects' })[tab]; }
function queryLabel(tab, form, bulk) { if (tab === 'check') return `${form.subjectType}:${form.subjectId}${form.subjectRelation ? `#${form.subjectRelation}` : ''} → ${form.resourceType}:${form.resourceId}#${form.permission}`; if (tab === 'bulk') return `${bulk.split(/\r?\n/).filter(Boolean).length} subjects → ${form.resourceType}:${form.resourceId}#${form.permission}`; return `${form.resourceType}:${form.resourceId}#${form.permission}${tab === 'lookup' ? ` ← ${form.subjectType}:*` : ''}`; }
function permissionLabel(value) { return ({ PERMISSIONSHIP_HAS_PERMISSION: 'Allowed', PERMISSIONSHIP_NO_PERMISSION: 'Denied', PERMISSIONSHIP_CONDITIONAL_PERMISSION: 'Conditional' })[value] || value; }
function permissionColor(value) { if (value === 'PERMISSIONSHIP_HAS_PERMISSION') return 'bg-green-100 text-green-800'; if (value === 'PERMISSIONSHIP_NO_PERMISSION') return 'bg-red-100 text-red-800'; return 'bg-amber-100 text-amber-800'; }
