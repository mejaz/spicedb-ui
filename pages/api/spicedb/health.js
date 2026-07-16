import { publicError, spiceDBFetch } from '../../../lib/spicedb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const startedAt = performance.now();
  try {
    await spiceDBFetch('/healthz', { method: 'GET', timeoutMs: 5000 });
    return res.status(200).json({
      status: 'healthy',
      connected: true,
      responseTimeMs: Math.round(performance.now() - startedAt),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({
      status: 'unhealthy',
      connected: false,
      responseTimeMs: Math.round(performance.now() - startedAt),
      checkedAt: new Date().toISOString(),
      message: failure.message,
    });
  }
}
