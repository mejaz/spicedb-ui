import { parseSchema } from '../../../lib/schema';
import { publicError, readSchema } from '../../../lib/spicedb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'private, max-age=15');
  try {
    return res.status(200).json({ resourceTypes: parseSchema(await readSchema()) });
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ message: failure.message });
  }
}
