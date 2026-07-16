export function isObjectReference(value) {
  return Boolean(value && typeof value.objectType === 'string' && value.objectType.trim() &&
    typeof value.objectId === 'string' && value.objectId.trim());
}

export function validateRelationship(relationship) {
  if (!relationship || !isObjectReference(relationship.resource)) return 'A valid resource is required';
  if (typeof relationship.relation !== 'string' || !relationship.relation.trim()) return 'A relation is required';
  if (!relationship.subject || !isObjectReference(relationship.subject.object)) return 'A valid subject is required';
  if (relationship.subject.optionalRelation !== undefined && typeof relationship.subject.optionalRelation !== 'string') {
    return 'Subject relation must be a string';
  }
  return null;
}

export function relationshipTuple(relationship) {
  const subjectRelation = relationship.subject.optionalRelation ? `#${relationship.subject.optionalRelation}` : '';
  const caveat = relationship.optionalCaveat?.caveatName ? ` with ${relationship.optionalCaveat.caveatName}` : '';
  return `${relationship.resource.objectType}:${relationship.resource.objectId}#${relationship.relation}` +
    `@${relationship.subject.object.objectType}:${relationship.subject.object.objectId}${subjectRelation}${caveat}`;
}

export function transformRelationship(source) {
  const relationship = source.relationship || source;
  const transformed = {
    resource: relationship.resource,
    relation: relationship.relation,
    subject: relationship.subject,
    ...(relationship.optionalCaveat ? { optionalCaveat: relationship.optionalCaveat } : {}),
  };
  return { ...transformed, tuple: relationshipTuple(transformed) };
}
