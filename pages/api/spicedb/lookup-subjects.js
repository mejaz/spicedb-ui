import { permissionBody, validatePermissionRequest } from '../../../lib/permissions';
import { enforceRateLimit } from '../../../lib/rate-limit';
import { publicError, readStream, spiceDBFetch } from '../../../lib/spicedb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  if (!enforceRateLimit(req, res, { name: 'lookup', limit: 30, windowMs: 60000 })) return;
  const validationError = validatePermissionRequest(req.body, { subjectType: true });
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const response = await spiceDBFetch('/v1/permissions/subjects', {
      body: { ...permissionBody(req.body, { subjectType: true }), optionalLimit: 100 },
    });
    const records = await readStream(response);
    return res.status(200).json({
      subjects: records.map((record) => record.result?.subject).filter(Boolean),
      truncated: records.length === 100,
    });
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ message: failure.message });
  }
}
