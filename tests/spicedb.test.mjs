import assert from 'node:assert/strict';
import test from 'node:test';
import { getSpiceDBConfig, SpiceDBRequestError, spiceDBFetch } from '../lib/spicedb.js';

test('configuration fails closed without URL and token', () => {
  const previousUrl = process.env.SPICEDB_URL;
  const previousToken = process.env.SPICEDB_TOKEN;
  delete process.env.SPICEDB_URL;
  delete process.env.SPICEDB_TOKEN;
  assert.throws(() => getSpiceDBConfig(), (error) => error instanceof SpiceDBRequestError && error.status === 503);
  restore('SPICEDB_URL', previousUrl);
  restore('SPICEDB_TOKEN', previousToken);
});

test('upstream error bodies are not exposed', async () => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.SPICEDB_URL;
  const previousToken = process.env.SPICEDB_TOKEN;
  process.env.SPICEDB_URL = 'http://localhost:8443';
  process.env.SPICEDB_TOKEN = 'top-secret-token';
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'sensitive relationship data' }), { status: 500 });
  await assert.rejects(() => spiceDBFetch('/v1/schema/read', { body: {} }), (error) => {
    assert.doesNotMatch(error.message, /sensitive|top-secret/);
    return true;
  });
  globalThis.fetch = originalFetch;
  restore('SPICEDB_URL', previousUrl);
  restore('SPICEDB_TOKEN', previousToken);
});

function restore(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
