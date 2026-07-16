import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSchema, validateSchemaText } from '../lib/schema.js';

test('parses definitions, relations and permissions', () => {
  const result = parseSchema(`
    definition user {}
    definition document {
      relation viewer: user
      permission view = viewer
    }
  `);
  assert.equal(result.length, 2);
  assert.deepEqual(result[1], {
    name: 'document',
    relations: [{ name: 'viewer', type: 'user' }],
    permissions: [{ name: 'view', expression: 'viewer' }],
  });
});

test('reports empty and structurally invalid schemas', () => {
  assert.deepEqual(validateSchemaText(''), ['Schema cannot be empty']);
  assert.ok(validateSchemaText('definition document {').includes('Schema contains unbalanced braces'));
});
