import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { parseSchema, validateSchemaText } from '../lib/schema';
import { useUiConfig } from '../lib/use-ui-config';

export default function SchemaPage() {
  const config = useUiConfig();
  const [schema, setSchema] = useState('');
  const [original, setOriginal] = useState('');
  const [hash, setHash] = useState('');
  const [tab, setTab] = useState('editor');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const load = useCallback(async (force = false) => {
    if (!force && schema !== original && !window.confirm('Discard unsaved schema changes?')) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/spicedb/schema', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load schema');
      setSchema(data.schema); setOriginal(data.schema); setHash(data.hash); setEditing(false);
    } catch (failure) { setError(failure.message || 'Unable to load schema'); }
    finally { setLoading(false); }
  }, [schema, original]);

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const beforeUnload = (event) => { if (schema !== original) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [schema, original]);

  const definitions = useMemo(() => parseSchema(schema), [schema]);
  const validationErrors = useMemo(() => validateSchemaText(schema), [schema]);
  const changed = schema !== original;
  const canEdit = !config.readOnly && config.role === 'admin';
  const diff = useMemo(() => diffSummary(original, schema), [original, schema]);

  const save = async () => {
    setError(''); setNotice('');
    try {
      const response = await fetch('/api/spicedb/schema', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, expectedHash: hash, confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors?.join('\n') || data.message || 'Schema write failed');
      setHash(data.hash); setOriginal(schema); setEditing(false); setConfirmOpen(false); setConfirmation(''); setNotice('Schema written successfully. The previous version remains available in your deployment/audit history.');
    } catch (failure) { setError(failure.message || 'Schema write failed'); setConfirmOpen(false); }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([schema], { type: 'text/plain' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `spicedb-schema-${new Date().toISOString().slice(0, 10)}.zed`; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h2 className="text-2xl font-bold">Schema</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Review first; schema writes require an admin, an unlocked editor and explicit confirmation.</p></div>
          <div className="flex flex-wrap gap-2"><button className="btn-secondary" type="button" onClick={download}>Export</button><button className="btn-secondary" type="button" onClick={() => load()}>Reload</button>{!editing && <button className="btn-primary" type="button" disabled={!canEdit || loading} onClick={() => setEditing(true)}>{canEdit ? 'Unlock editor' : 'Admin write required'}</button>}</div>
        </section>
        {error && <pre className="alert-error whitespace-pre-wrap" role="alert">{error}</pre>}
        {notice && <div className="alert-success" role="status">{notice}</div>}
        {changed && <div className="alert-warning" role="status">You have unsaved changes. Reloading or leaving will discard them.</div>}

        <div className="border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Schema views">
          <div className="flex gap-6">{[['editor','Editor'],['diff','Diff'],['visual','Definitions']].map(([value,label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`border-b-2 px-1 py-3 text-sm font-medium ${tab === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>{label}</button>)}</div>
        </div>

        {tab === 'editor' && <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 text-sm dark:border-gray-700"><span>{schema.split('\n').length} lines · {definitions.length} definitions</span><span className={validationErrors.length ? 'text-red-600' : 'text-green-600'}>{validationErrors.length ? `${validationErrors.length} local validation issue(s)` : 'Basic structure valid'}</span></div>
          <textarea aria-label="SpiceDB schema" spellCheck="false" readOnly={!editing} value={schema} onChange={(event) => setSchema(event.target.value)} className="min-h-[32rem] w-full resize-y bg-gray-950 p-5 font-mono text-sm leading-6 text-gray-100 outline-none read-only:cursor-default read-only:opacity-90" />
          {validationErrors.length > 0 && <ul className="border-t border-red-200 bg-red-50 p-4 text-sm text-red-800">{validationErrors.map((item) => <li key={item}>• {item}</li>)}</ul>}
          {editing && <footer className="flex justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700"><button type="button" className="btn-secondary" onClick={() => { setSchema(original); setEditing(false); }}>Discard</button><button type="button" className="btn-primary" disabled={!changed || validationErrors.length > 0} onClick={() => setConfirmOpen(true)}>Review and write</button></footer>}
        </section>}

        {tab === 'diff' && <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3"><Stat label="Lines added" value={diff.added} /><Stat label="Lines removed" value={diff.removed} /><Stat label="Definitions changed" value={Math.abs(parseSchema(original).length - definitions.length) || (changed ? 'Review below' : 0)} /></div>
          {!changed ? <div className="card p-8 text-center text-gray-500">The editor matches the live schema.</div> : <div className="grid gap-4 lg:grid-cols-2"><SchemaSnapshot title="Live schema" value={original} /><SchemaSnapshot title="Proposed schema" value={schema} /></div>}
        </section>}

        {tab === 'visual' && <section className="grid gap-4 lg:grid-cols-2">{definitions.map((definition) => <article key={definition.name} className="card p-5"><h3 className="font-mono text-lg font-semibold text-blue-700 dark:text-blue-300">{definition.name}</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><DefinitionList title="Relations" items={definition.relations.map((item) => `${item.name}: ${item.type}`)} /><DefinitionList title="Permissions" items={definition.permissions.map((item) => `${item.name} = ${item.expression}`)} /></div></article>)}{!definitions.length && <div className="card p-8 text-gray-500">No definitions could be parsed.</div>}</section>}
      </div>

      <Modal open={confirmOpen} title="Confirm schema write" onClose={() => setConfirmOpen(false)} footer={<><button className="btn-secondary" type="button" onClick={() => setConfirmOpen(false)}>Cancel</button><button className="btn-danger" type="button" disabled={confirmation !== 'WRITE SCHEMA'} onClick={save}>Write live schema</button></>}>
        <div className="alert-warning">Schema changes can invalidate permissions or orphan relationships. SpiceDB will perform authoritative validation during the write.</div>
        <div className="my-4 grid grid-cols-2 gap-3"><Stat label="Lines added" value={diff.added} /><Stat label="Lines removed" value={diff.removed} /></div>
        <label className="block"><span className="label">Type WRITE SCHEMA to continue</span><input className="input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>
      </Modal>
    </Layout>
  );
}

function Stat({ label, value }) { return <div className="card p-4"><p className="text-xs uppercase text-gray-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
function SchemaSnapshot({ title, value }) { return <div className="card overflow-hidden"><h3 className="border-b border-gray-200 px-4 py-3 font-semibold dark:border-gray-700">{title}</h3><pre className="max-h-[32rem] overflow-auto whitespace-pre p-4 text-xs">{value}</pre></div>; }
function DefinitionList({ title, items }) { return <div><h4 className="mb-2 text-sm font-semibold">{title}</h4>{items.length ? <ul className="space-y-2">{items.map((item) => <li key={item} className="rounded bg-gray-50 p-2 font-mono text-xs dark:bg-gray-900">{item}</li>)}</ul> : <p className="text-sm text-gray-500">None</p>}</div>; }
function diffSummary(before, after) { const beforeLines = new Set(before.split('\n')); const afterLines = new Set(after.split('\n')); return { added: [...afterLines].filter((line) => !beforeLines.has(line)).length, removed: [...beforeLines].filter((line) => !afterLines.has(line)).length }; }
