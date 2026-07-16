import { isObjectReference } from './relationships';

export function validatePermissionRequest(body, options = {}) {
  if (!isObjectReference(body?.resource)) return 'A valid resource is required';
  if (typeof body.permission !== 'string' || !body.permission.trim()) return 'A permission is required';
  if (options.subject && (!body.subject || !isObjectReference(body.subject.object))) return 'A valid subject is required';
  if (options.subjectType && (typeof body.subjectObjectType !== 'string' || !body.subjectObjectType.trim())) {
    return 'A subject object type is required';
  }
  if (body.context !== undefined && (!body.context || typeof body.context !== 'object' || Array.isArray(body.context))) {
    return 'Context must be a JSON object';
  }
  return null;
}

export function permissionBody(body, options = {}) {
  return {
    resource: body.resource,
    permission: body.permission.trim(),
    ...(options.subject ? { subject: body.subject } : {}),
    ...(options.subjectType ? { subjectObjectType: body.subjectObjectType.trim() } : {}),
    ...(body.context ? { context: body.context } : {}),
    ...(body.consistency ? { consistency: body.consistency } : {}),
  };
}
