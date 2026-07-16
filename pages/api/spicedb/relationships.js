import { relationshipTuple, transformRelationship, validateRelationship } from '../../../lib/relationships';
import { enforceRateLimit } from '../../../lib/rate-limit';
import { assertMutationAllowed, auditMutation } from '../../../lib/security';
import { publicError, readStream, spiceDBFetch, spiceDBJson } from '../../../lib/spicedb';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return list(req, res);
  if (req.method === 'POST') return write(req, res);
  if (req.method === 'DELETE') return remove(req, res);
  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ message: 'Method not allowed' });
}

async function list(req, res) {
  const resourceType = clean(req.query.resource_type, 120);
  if (!resourceType) {
    return res.status(400).json({ message: 'Choose a resource type before loading relationships' });
  }

  const pageSize = Math.min(Math.max(Number(req.query.page_size) || 10, 1), 100);
  const relationshipFilter = { resourceType };
  add(relationshipFilter, 'optionalResourceId', clean(req.query.resource_id, 1024));
  add(relationshipFilter, 'optionalRelation', clean(req.query.relation, 120));
  const subjectType = clean(req.query.subject_type, 120);
  const subjectId = clean(req.query.subject_id, 1024);
  const subjectRelation = clean(req.query.subject_relation, 120);
  if (subjectType) {
    relationshipFilter.optionalSubjectFilter = { subjectType };
    add(relationshipFilter.optionalSubjectFilter, 'optionalSubjectId', subjectId);
    add(relationshipFilter.optionalSubjectFilter, 'optionalRelation', subjectRelation);
  }

  const request = { relationshipFilter, optionalLimit: pageSize + 1 };
  const cursor = clean(req.query.cursor, 8192);
  if (cursor) request.optionalCursor = { token: cursor };

  try {
    const response = await spiceDBFetch('/v1/relationships/read', { body: request });
    const records = await readStream(response);
    const results = records.map((record) => record.result).filter((result) => result?.relationship);
    const hasNextPage = results.length > pageSize;
    const visible = results.slice(0, pageSize);
    const finalResult = visible.at(-1);
    return res.status(200).json({
      relationships: visible.map((result) => transformRelationship(result.relationship)),
      nextCursor: hasNextPage ? cursorToken(finalResult?.afterResultCursor) : null,
      hasNextPage,
      pageSize,
    });
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ message: failure.message });
  }
}

async function write(req, res) {
  if (!enforceRateLimit(req, res, { name: 'relationship-write', limit: 30, windowMs: 60000 })) return;
  const denied = assertMutationAllowed(req, 'relationships');
  if (denied) return res.status(denied.status).json({ message: denied.message });

  const { relationship, operation = 'TOUCH' } = req.body || {};
  const validationError = validateRelationship(relationship);
  if (validationError) return res.status(400).json({ message: validationError });
  if (!['CREATE', 'TOUCH'].includes(operation)) return res.status(400).json({ message: 'Operation must be CREATE or TOUCH' });

  try {
    const data = await spiceDBJson('/v1/relationships/write', {
      body: { updates: [{ operation: `OPERATION_${operation}`, relationship }] },
    });
    auditMutation(req, 'relationship.write', { operation, tuple: relationshipTuple(relationship) });
    return res.status(200).json(data);
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ message: failure.message });
  }
}

async function remove(req, res) {
  if (!enforceRateLimit(req, res, { name: 'relationship-delete', limit: 20, windowMs: 60000 })) return;
  const denied = assertMutationAllowed(req, 'relationships');
  if (denied) return res.status(denied.status).json({ message: denied.message });

  const { relationship, confirmation } = req.body || {};
  const validationError = validateRelationship(relationship);
  if (validationError) return res.status(400).json({ message: validationError });
  const tuple = relationshipTuple(relationship);
  if (confirmation !== tuple) return res.status(400).json({ message: 'Exact relationship confirmation does not match' });

  const relationshipFilter = {
    resourceType: relationship.resource.objectType,
    optionalResourceId: relationship.resource.objectId,
    optionalRelation: relationship.relation,
    optionalSubjectFilter: {
      subjectType: relationship.subject.object.objectType,
      optionalSubjectId: relationship.subject.object.objectId,
    },
  };
  add(relationshipFilter.optionalSubjectFilter, 'optionalRelation', relationship.subject.optionalRelation);

  try {
    const data = await spiceDBJson('/v1/relationships/delete', { body: { relationshipFilter } });
    auditMutation(req, 'relationship.delete', { tuple });
    return res.status(200).json(data);
  } catch (error) {
    const failure = publicError(error);
    return res.status(failure.status).json({ message: failure.message });
  }
}

function clean(value, maxLength) {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (typeof normalized !== 'string') return '';
  return normalized.trim().slice(0, maxLength);
}

function add(target, key, value) {
  if (value) target[key] = value;
}

function cursorToken(cursor) {
  return typeof cursor === 'string' ? cursor : cursor?.token || cursor?.token_value || null;
}
