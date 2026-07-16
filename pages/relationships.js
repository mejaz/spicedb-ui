import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useUiConfig } from '../lib/use-ui-config';

const PAGE_SIZE = 10;
const emptyFilters = { resourceId: '', relation: '', subjectType: '', subjectId: '', subjectRelation: '' };
const emptyDraft = { resourceType: '', resourceId: '', relation: '', subjectType: '', subjectId: '', subjectRelation: '', caveatName: '', caveatContext: '', operation: 'TOUCH' };

export default function Relationships() {
  const config = useUiConfig();
  const [resourceTypes, setResourceTypes] = useState([]);
  const [resourceType, setResourceType] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [relationships, setRelationships] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [previousCursors, setPreviousCursors] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    fetch('/api/spicedb/resources')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setResourceTypes(data.resourceTypes || []);
        const first = data.resourceTypes?.[0]?.name || '';
        setResourceType(first);
        setDraft((current) => ({ ...current, resourceType: first }));
      })
      .catch((failure) => { setError(failure.message || 'Unable to load schema'); setLoading(false); });
  }, []);

  const load = useCallback(async () => {
    if (!resourceType) return;
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ resource_type: resourceType, page_size: String(PAGE_SIZE) });
    if (cursor) query.set('cursor', cursor);
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) query.set(toQueryKey(key), value);
    });
    try {
      const response = await fetch(`/api/spicedb/relationships?${query}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load relationships');
      setRelationships(data.relationships || []);
      setNextCursor(data.nextCursor || null);
    } catch (failure) {
      setError(failure.message || 'Unable to load relationships');
      setRelationships([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [resourceType, cursor, appliedFilters]);

  useEffect(() => { load(); }, [load]);

  const selectedDefinition = useMemo(() => resourceTypes.find((item) => item.name === draft.resourceType), [resourceTypes, draft.resourceType]);
  const canWrite = !config.readOnly && ['operator', 'admin'].includes(config.role);
  const tenantWarning = crossTenantWarning(draft.resourceId, draft.subjectId, config.tenantDelimiter);

  const applySearch = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
    setCursor(null);
    setPreviousCursors([]);
    setPage(1);
  };

  const clearSearch = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCursor(null);
    setPreviousCursors([]);
    setPage(1);
  };

  const nextPage = () => {
    if (!nextCursor) return;
    setPreviousCursors((values) => [...values, cursor]);
    setCursor(nextCursor);
    setPage((value) => value + 1);
  };

  const previousPage = () => {
    if (!previousCursors.length) return;
    const values = [...previousCursors];
    setCursor(values.pop() || null);
    setPreviousCursors(values);
    setPage((value) => Math.max(1, value - 1));
  };

  const createRelationship = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const relationship = relationshipFromDraft(draft);
      const response = await fetch('/api/spicedb/relationships', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationship, operation: draft.operation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Relationship write failed');
      setAddOpen(false);
      setNotice('Relationship saved');
      setDraft({ ...emptyDraft, resourceType });
      setCursor(null); setPreviousCursors([]); setPage(1);
      await load();
    } catch (failure) {
      setError(failure.message || 'Relationship write failed');
    }
  };

  const deleteRelationship = async () => {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.tuple) return;
    setError('');
    try {
      const response = await fetch('/api/spicedb/relationships', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationship: withoutTuple(deleteTarget), confirmation: deleteConfirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Relationship deletion failed');
      setDeleteTarget(null); setDeleteConfirmation(''); setNotice('Exact relationship deleted');
      await load();
    } catch (failure) {
      setError(failure.message || 'Relationship deletion failed');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h2 className="text-2xl font-bold">Relationships</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Cursor-based browsing with exact SpiceDB filters.</p></div>
          <button type="button" className="btn-primary" disabled={!canWrite} onClick={() => setAddOpen(true)}>{canWrite ? 'Add relationship' : 'Writes disabled'}</button>
        </section>

        {error && <div role="alert" className="alert-error">{error}</div>}
        {notice && <div role="status" className="alert-success">{notice}</div>}

        <form onSubmit={applySearch} className="card grid gap-4 p-5 md:grid-cols-3">
          <Field label="Resource type"><select value={resourceType} onChange={(event) => { setResourceType(event.target.value); setCursor(null); setPreviousCursors([]); setPage(1); }} className="input">{resourceTypes.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field>
          <Field label="Resource ID"><input className="input" value={filters.resourceId} onChange={(event) => setFilters({ ...filters, resourceId: event.target.value })} placeholder="Exact ID" /></Field>
          <Field label="Relation"><input className="input" value={filters.relation} onChange={(event) => setFilters({ ...filters, relation: event.target.value })} placeholder="Exact relation" /></Field>
          <Field label="Subject type"><input className="input" value={filters.subjectType} onChange={(event) => setFilters({ ...filters, subjectType: event.target.value })} placeholder="e.g. user" /></Field>
          <Field label="Subject ID"><input className="input" value={filters.subjectId} onChange={(event) => setFilters({ ...filters, subjectId: event.target.value })} placeholder="Exact ID" /></Field>
          <Field label="Subject relation"><input className="input" value={filters.subjectRelation} onChange={(event) => setFilters({ ...filters, subjectRelation: event.target.value })} placeholder="e.g. member" /></Field>
          <div className="flex gap-3 md:col-span-3"><button className="btn-primary" type="submit">Apply filters</button><button className="btn-secondary" type="button" onClick={clearSearch}>Clear</button></div>
        </form>

        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400"><tr><th className="px-5 py-3">Relationship tuple</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {!loading && relationships.map((relationship) => (
                  <tr key={relationship.tuple} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-5 py-4"><code className="break-all text-sm">{relationship.tuple}</code>{relationship.optionalCaveat && <pre className="mt-2 max-w-2xl overflow-auto text-xs text-gray-500">{JSON.stringify(relationship.optionalCaveat, null, 2)}</pre>}</td>
                    <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" className="btn-small" onClick={() => navigator.clipboard.writeText(relationship.tuple)}>Copy</button>{canWrite && <button type="button" className="btn-danger-small" onClick={() => { setDeleteTarget(relationship); setDeleteConfirmation(''); }}>Delete</button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <div className="p-10 text-center text-gray-500" role="status">Loading relationships…</div>}
          {!loading && !relationships.length && <div className="p-10 text-center text-gray-500">No relationships matched these exact filters.</div>}
          <footer className="flex items-center justify-between border-t border-gray-200 px-5 py-4 text-sm dark:border-gray-700">
            <span>Page {page} · up to {PAGE_SIZE} rows</span>
            <div className="flex gap-2"><button className="btn-secondary" type="button" disabled={!previousCursors.length || loading} onClick={previousPage}>Previous</button><button className="btn-secondary" type="button" disabled={!nextCursor || loading} onClick={nextPage}>Next</button></div>
          </footer>
        </section>
      </div>

      <Modal open={addOpen} title="Add relationship" onClose={() => setAddOpen(false)} footer={<><button type="button" className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button><button type="submit" form="add-relationship" className="btn-primary">Save relationship</button></>}>
        <form id="add-relationship" onSubmit={createRelationship} className="grid gap-4 sm:grid-cols-2">
          <Field label="Resource type"><select required className="input" value={draft.resourceType} onChange={(event) => setDraft({ ...draft, resourceType: event.target.value, relation: '' })}>{resourceTypes.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field>
          <Field label="Resource ID"><input required className="input" value={draft.resourceId} onChange={(event) => setDraft({ ...draft, resourceId: event.target.value })} /></Field>
          <Field label="Relation"><select required className="input" value={draft.relation} onChange={(event) => setDraft({ ...draft, relation: event.target.value })}><option value="">Choose relation</option>{selectedDefinition?.relations.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field>
          <Field label="Write behavior"><select className="input" value={draft.operation} onChange={(event) => setDraft({ ...draft, operation: event.target.value })}><option value="TOUCH">Touch (idempotent)</option><option value="CREATE">Create (fail if present)</option></select></Field>
          <Field label="Subject type"><select required className="input" value={draft.subjectType} onChange={(event) => setDraft({ ...draft, subjectType: event.target.value })}><option value="">Choose type</option>{resourceTypes.map((item) => <option key={item.name}>{item.name}</option>)}</select></Field>
          <Field label="Subject ID"><input required className="input" value={draft.subjectId} onChange={(event) => setDraft({ ...draft, subjectId: event.target.value })} /></Field>
          <Field label="Subject relation (optional)"><input className="input" value={draft.subjectRelation} onChange={(event) => setDraft({ ...draft, subjectRelation: event.target.value })} placeholder="e.g. member" /></Field>
          <Field label="Caveat name (optional)"><input className="input" value={draft.caveatName} onChange={(event) => setDraft({ ...draft, caveatName: event.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Caveat context (JSON)"><textarea className="input min-h-24 font-mono" value={draft.caveatContext} onChange={(event) => setDraft({ ...draft, caveatContext: event.target.value })} placeholder='{"key":"value"}' /></Field></div>
          {tenantWarning && <div className="alert-warning sm:col-span-2">{tenantWarning}</div>}
          {draft.resourceType && draft.resourceId && draft.relation && draft.subjectType && draft.subjectId && <div className="sm:col-span-2"><p className="label">Tuple preview</p><code className="block break-all rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">{previewTuple(draft)}</code></div>}
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="Delete exact relationship" onClose={() => setDeleteTarget(null)} footer={<><button className="btn-secondary" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn-danger" type="button" disabled={deleteConfirmation !== deleteTarget?.tuple} onClick={deleteRelationship}>Delete exact tuple</button></>}>
        <p className="text-sm text-gray-600 dark:text-gray-300">This cannot be undone. Copy the complete tuple below into the confirmation field.</p>
        <code className="my-4 block break-all rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">{deleteTarget?.tuple}</code>
        <Field label="Exact tuple confirmation"><input autoComplete="off" className="input" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></Field>
      </Modal>
    </Layout>
  );
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label>; }
function toQueryKey(key) { return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`); }
function relationshipFromDraft(draft) {
  let context;
  if (draft.caveatContext.trim()) context = JSON.parse(draft.caveatContext);
  return {
    resource: { objectType: draft.resourceType.trim(), objectId: draft.resourceId.trim() },
    relation: draft.relation.trim(),
    subject: { object: { objectType: draft.subjectType.trim(), objectId: draft.subjectId.trim() }, ...(draft.subjectRelation.trim() ? { optionalRelation: draft.subjectRelation.trim() } : {}) },
    ...(draft.caveatName.trim() ? { optionalCaveat: { caveatName: draft.caveatName.trim(), ...(context ? { context } : {}) } } : {}),
  };
}
function previewTuple(draft) { try { const relationship = relationshipFromDraft(draft); const relation = relationship.subject.optionalRelation ? `#${relationship.subject.optionalRelation}` : ''; const caveat = relationship.optionalCaveat ? ` with ${relationship.optionalCaveat.caveatName}` : ''; return `${relationship.resource.objectType}:${relationship.resource.objectId}#${relationship.relation}@${relationship.subject.object.objectType}:${relationship.subject.object.objectId}${relation}${caveat}`; } catch { return 'Caveat context is not valid JSON'; } }
function crossTenantWarning(resourceId, subjectId, delimiter) { if (!delimiter || !resourceId.includes(delimiter) || !subjectId.includes(delimiter)) return ''; const resourceTenant = resourceId.split(delimiter)[0]; const subjectTenant = subjectId.split(delimiter)[0]; return resourceTenant !== subjectTenant ? `Possible cross-tenant relationship: ${resourceTenant} → ${subjectTenant}. Verify this is intentional.` : ''; }
function withoutTuple({ tuple: _tuple, ...relationship }) { return relationship; }
