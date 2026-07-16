import { parseSchema } from '../../../lib/schema';
import { publicError, readSchema } from '../../../lib/spicedb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');

  try {
    const definitions = parseSchema(await readSchema());
    return res.status(200).json({
      connected: true,
      definitions: definitions.length,
      relations: definitions.reduce((total, item) => total + item.relations.length, 0),
      permissions: definitions.reduce((total, item) => total + item.permissions.length, 0),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ connected: false, message: failure.message });
  }
}
