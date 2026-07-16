import { permissionBody, validatePermissionRequest } from '../../../lib/permissions';
import { enforceRateLimit } from '../../../lib/rate-limit';
import { publicError, spiceDBJson } from '../../../lib/spicedb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  if (!enforceRateLimit(req, res, { name: 'check-bulk', limit: 10, windowMs: 60000 })) return;
  const requests = req.body?.requests;
  if (!Array.isArray(requests) || requests.length < 1 || requests.length > 50) {
    return res.status(400).json({ message: 'Provide between 1 and 50 permission checks' });
  }
  const invalidIndex = requests.findIndex((request) => validatePermissionRequest(request, { subject: true }));
  if (invalidIndex >= 0) return res.status(400).json({ message: `Permission check ${invalidIndex + 1} is invalid` });

  try {
    const results = [];
    for (let index = 0; index < requests.length; index += 5) {
      const batch = requests.slice(index, index + 5);
      const values = await Promise.all(batch.map((request) =>
        spiceDBJson('/v1/permissions/check', { body: permissionBody(request, { subject: true }) })
      ));
      results.push(...values);
    }
    return res.status(200).json({ results });
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ message: failure.message });
  }
}
