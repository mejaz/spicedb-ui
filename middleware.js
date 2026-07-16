import { NextResponse } from 'next/server';

export function middleware(request) {
  if (request.nextUrl.pathname === '/api/healthz') return NextResponse.next();
  const authDisabled = process.env.NODE_ENV !== 'production' && process.env.SPICEDB_UI_AUTH_DISABLED === 'true';
  const configuredUsers = loadUsers();

  if (authDisabled || (process.env.NODE_ENV !== 'production' && configuredUsers.length === 0)) {
    return continueAs(request, process.env.SPICEDB_UI_DEV_USER || 'developer', process.env.SPICEDB_UI_ROLE || 'admin');
  }

  if (configuredUsers.length === 0) {
    return new NextResponse('SpiceDB UI authentication is not configured', { status: 503 });
  }

  const credentials = parseBasicAuth(request.headers.get('authorization'));
  const user = configuredUsers.find((candidate) => constantTimeEqual(candidate.username, credentials?.username) && constantTimeEqual(candidate.password, credentials?.password));
  if (!user) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="SpiceDB UI", charset="UTF-8"' },
    });
  }

  return continueAs(request, user.username, user.role);
}

function continueAs(request, username, role) {
  const headers = new Headers(request.headers);
  headers.set('x-spicedb-ui-user', username);
  headers.set('x-spicedb-ui-role', ['viewer', 'operator', 'admin'].includes(role) ? role : 'viewer');
  return NextResponse.next({ request: { headers } });
}

function loadUsers() {
  if (process.env.SPICEDB_UI_USERS) {
    try {
      const parsed = JSON.parse(process.env.SPICEDB_UI_USERS);
      return Object.entries(parsed).map(([username, value]) => ({
        username,
        password: typeof value === 'string' ? value : value.password,
        role: typeof value === 'string' ? 'viewer' : value.role || 'viewer',
      })).filter((user) => user.password);
    } catch {
      return [];
    }
  }

  if (process.env.SPICEDB_UI_USERNAME && process.env.SPICEDB_UI_PASSWORD) {
    return [{
      username: process.env.SPICEDB_UI_USERNAME,
      password: process.env.SPICEDB_UI_PASSWORD,
      role: process.env.SPICEDB_UI_ROLE || 'viewer',
    }];
  }
  return [];
}

function parseBasicAuth(header) {
  if (!header?.startsWith('Basic ')) return null;
  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

function constantTimeEqual(expected, actual) {
  if (typeof expected !== 'string' || typeof actual !== 'string') return false;
  if (!expected.length || !actual.length) return false;
  const length = Math.max(expected.length, actual.length);
  let difference = expected.length ^ actual.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (expected.charCodeAt(index % expected.length) || 0) ^ (actual.charCodeAt(index % actual.length) || 0);
  }
  return difference === 0;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
