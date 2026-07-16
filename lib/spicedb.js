const DEFAULT_TIMEOUT_MS = 10000;

export class SpiceDBRequestError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'SpiceDBRequestError';
    this.status = status;
  }
}

export function getSpiceDBConfig() {
  const url = process.env.SPICEDB_URL?.replace(/\/$/, '');
  const token = process.env.SPICEDB_TOKEN;

  if (!url || !token) {
    throw new SpiceDBRequestError('SpiceDB is not configured', 503);
  }

  if (process.env.NODE_ENV === 'production' && !url.startsWith('https://') && !isPrivateUrl(url)) {
    throw new SpiceDBRequestError('SpiceDB must use HTTPS outside a private network', 503);
  }

  return { url, token };
}

function isPrivateUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' ||
      hostname.endsWith('.local') || /^10\./.test(hostname) || /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || !hostname.includes('.');
  } catch {
    return false;
  }
}

export async function spiceDBFetch(path, { method = 'POST', body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const { url, token } = getSpiceDBConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new SpiceDBRequestError(safeUpstreamMessage(response.status, text), response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof SpiceDBRequestError) throw error;
    if (error.name === 'AbortError') {
      throw new SpiceDBRequestError('SpiceDB request timed out', 504);
    }
    throw new SpiceDBRequestError('SpiceDB is unavailable', 503);
  } finally {
    clearTimeout(timer);
  }
}

export async function spiceDBJson(path, options) {
  const response = await spiceDBFetch(path, options);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function readStream(response) {
  const text = await response.text();
  if (!text.trim()) return [];

  const records = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      throw new SpiceDBRequestError('SpiceDB returned an invalid streaming response', 502);
    }
  }
  return records;
}

export async function readSchema() {
  const data = await spiceDBJson('/v1/schema/read', { body: {} });
  return data.schemaText ?? data.schema_text ?? '';
}

export function publicError(error) {
  if (error instanceof SpiceDBRequestError) {
    return { status: normalizeStatus(error.status), message: error.message };
  }
  return { status: 500, message: 'Internal server error' };
}

function normalizeStatus(status) {
  return status >= 400 && status < 600 ? status : 502;
}

function safeUpstreamMessage(status, _text) {
  return `SpiceDB request failed (${status}). Review the SpiceDB server logs for details.`;
}
