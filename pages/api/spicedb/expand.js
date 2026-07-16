import { permissionBody, validatePermissionRequest } from '../../../lib/permissions';
import { enforceRateLimit } from '../../../lib/rate-limit';
import { publicError, spiceDBJson } from '../../../lib/spicedb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  if (!enforceRateLimit(req, res, { name: 'expand', limit: 60, windowMs: 60000 })) return;
  const validationError = validatePermissionRequest(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const data = await spiceDBJson('/v1/permissions/expand', { body: permissionBody(req.body) });
    return res.status(200).json(data);
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ message: failure.message });
  }
}
