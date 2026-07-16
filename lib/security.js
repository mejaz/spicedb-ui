import crypto from 'node:crypto';

export function getUiConfig(req) {
  return {
    environment: process.env.SPICEDB_UI_ENVIRONMENT || process.env.NODE_ENV || 'development',
    readOnly: parseBoolean(process.env.SPICEDB_UI_READ_ONLY, true),
    role: req?.headers?.['x-spicedb-ui-role'] || 'viewer',
    user: req?.headers?.['x-spicedb-ui-user'] || 'anonymous',
    tenantDelimiter: process.env.SPICEDB_UI_TENANT_DELIMITER || '|',
  };
}

export function assertMutationAllowed(req, capability) {
  const config = getUiConfig(req);
  if (config.readOnly) {
    return { status: 403, message: 'This SpiceDB UI is in read-only mode' };
  }

  const allowedRoles = capability === 'schema' ? ['admin'] : ['admin', 'operator'];
  if (!allowedRoles.includes(config.role)) {
    return { status: 403, message: `The ${config.role} role cannot perform this operation` };
  }

  const origin = req.headers.origin;
  if (origin) {
    const forwardedHost = firstHeader(req.headers['x-forwarded-host']);
    const host = forwardedHost || req.headers.host;
    const forwardedProto = firstHeader(req.headers['x-forwarded-proto']);
    const protocol = forwardedProto || (req.socket?.encrypted ? 'https' : 'http');
    if (!host || origin !== `${protocol}://${host}`) {
      return { status: 403, message: 'Cross-origin mutation rejected' };
    }
  }

  return null;
}

export function auditMutation(req, event, details = {}) {
  const { user, role, environment } = getUiConfig(req);
  console.info(JSON.stringify({
    event: 'spicedb_ui_mutation',
    action: event,
    actor: user,
    role,
    environment,
    timestamp: new Date().toISOString(),
    ...details,
  }));
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function firstHeader(value) {
  return typeof value === 'string' ? value.split(',')[0].trim() : undefined;
}
