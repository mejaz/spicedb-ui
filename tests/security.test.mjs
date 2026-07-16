import assert from 'node:assert/strict';
import test from 'node:test';
import { assertMutationAllowed, parseBoolean } from '../lib/security.js';

test('read-only is the safe boolean default', () => {
  assert.equal(parseBoolean(undefined, true), true);
  assert.equal(parseBoolean('false', true), false);
});

test('relationship writes require operator or admin and same origin', () => {
  process.env.SPICEDB_UI_READ_ONLY = 'false';
  const base = { headers: { host: 'ui.example.test', origin: 'https://ui.example.test', 'x-forwarded-proto': 'https' }, socket: {} };
  assert.equal(assertMutationAllowed({ ...base, headers: { ...base.headers, 'x-spicedb-ui-role': 'operator' } }, 'relationships'), null);
  assert.equal(assertMutationAllowed({ ...base, headers: { ...base.headers, 'x-spicedb-ui-role': 'viewer' } }, 'relationships').status, 403);
  assert.equal(assertMutationAllowed({ ...base, headers: { ...base.headers, origin: 'https://evil.example', 'x-spicedb-ui-role': 'admin' } }, 'schema').status, 403);
  delete process.env.SPICEDB_UI_READ_ONLY;
});
