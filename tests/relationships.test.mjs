import assert from 'node:assert/strict';
import test from 'node:test';
import { relationshipTuple, transformRelationship, validateRelationship } from '../lib/relationships.js';

const relationship = {
  resource: { objectType: 'document', objectId: 'tenant|handbook' },
  relation: 'viewer',
  subject: { object: { objectType: 'group', objectId: 'tenant|staff' }, optionalRelation: 'member' },
  optionalCaveat: { caveatName: 'during_business_hours', context: { timezone: 'UTC' } },
};

test('formats complete relationship tuples without inventing timestamps', () => {
  assert.equal(relationshipTuple(relationship), 'document:tenant|handbook#viewer@group:tenant|staff#member with during_business_hours');
  const transformed = transformRelationship(relationship);
  assert.equal(transformed.createdAt, undefined);
  assert.equal(transformed.tuple, relationshipTuple(relationship));
});

test('validates required relationship fields', () => {
  assert.equal(validateRelationship(relationship), null);
  assert.equal(validateRelationship({ ...relationship, relation: '' }), 'A relation is required');
});
