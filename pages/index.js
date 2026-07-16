import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    setError('');
    try {
      const [statsResponse, healthResponse] = await Promise.all([
        fetch('/api/spicedb/stats', { cache: 'no-store' }),
        fetch('/api/spicedb/health', { cache: 'no-store' }),
      ]);
      const stats = await statsResponse.json();
      const health = await healthResponse.json();
      if (!statsResponse.ok || !healthResponse.ok) throw new Error(stats.message || health.message || 'SpiceDB is unavailable');
      setData({ ...stats, ...health, refreshedAt: new Date().toISOString() });
    } catch (failure) {
      setError(failure.message || 'Unable to load SpiceDB status');
      setData((current) => current ? { ...current, connected: false } : null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const cards = [
    ['Definitions', data?.definitions ?? '—'],
    ['Relations', data?.relations ?? '—'],
    ['Permissions', data?.permissions ?? '—'],
    ['Latency', data ? `${data.responseTimeMs} ms` : '—'],
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold">Instance overview</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Live health and schema metadata. No simulated events or counts.</p>
          </div>
          <button type="button" onClick={() => refresh()} disabled={refreshing} className="btn-secondary">{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        </section>

        {error && <div className="alert-error" role="alert"><strong>Connection problem:</strong> {error}</div>}

        <section className="card p-6" aria-label="Connection status">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${data?.connected ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
              <div><p className="font-semibold">{data?.connected ? 'SpiceDB is healthy' : 'SpiceDB status unavailable'}</p></div>
            </div>
            {data?.refreshedAt && <time className="text-xs text-gray-500" dateTime={data.refreshedAt}>Checked {new Date(data.refreshedAt).toLocaleTimeString()}</time>}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Schema statistics">
          {cards.map(([label, value]) => <div key={label} className="card p-5"><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold">Common tasks</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link className="btn-secondary text-center" href="/schema">Review schema</Link>
            <Link className="btn-secondary text-center" href="/relationships">Browse relationships</Link>
            <Link className="btn-secondary text-center" href="/check">Test authorization</Link>
          </div>
        </section>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">SpiceDB does not expose historical activity or relationship creation times. Mutations from this UI are emitted as structured server audit logs.</p>
      </div>
    </Layout>
  );
}
