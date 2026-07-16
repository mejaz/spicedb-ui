import { parseSchema, validateSchemaText } from '../../../lib/schema';
import { enforceRateLimit } from '../../../lib/rate-limit';
import { assertMutationAllowed, auditMutation, sha256 } from '../../../lib/security';
import { publicError, readSchema, spiceDBJson } from '../../../lib/spicedb';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return read(req, res);
  if (req.method === 'PUT') return write(req, res);
  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ message: 'Method not allowed' });
}

async function read(_req, res) {
  try {
    const schema = await readSchema();
    return res.status(200).json({ schema, hash: sha256(schema), definitions: parseSchema(schema) });
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ message: failure.message });
  }
}

async function write(req, res) {
  if (!enforceRateLimit(req, res, { name: 'schema-write', limit: 5, windowMs: 60000 })) return;
  const denied = assertMutationAllowed(req, 'schema');
  if (denied) return res.status(denied.status).json({ message: denied.message });

  const { schema, expectedHash, confirmation } = req.body || {};
  if (confirmation !== 'WRITE SCHEMA') {
    return res.status(400).json({ message: 'Schema write confirmation is required' });
  }

  const errors = validateSchemaText(schema);
  if (errors.length) return res.status(400).json({ message: 'Schema validation failed', errors });

  try {
    const current = await readSchema();
    if (!expectedHash || expectedHash !== sha256(current)) {
      return res.status(409).json({ message: 'The live schema changed after you loaded it. Reload and review the diff.' });
    }

    const data = await spiceDBJson('/v1/schema/write', { body: { schema } });
    auditMutation(req, 'schema.write', {
      previousHash: expectedHash,
      newHash: sha256(schema),
      definitionCount: parseSchema(schema).length,
    });
    return res.status(200).json({ ...data, hash: sha256(schema) });
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ message: failure.message });
  }
}
