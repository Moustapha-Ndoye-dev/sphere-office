type HeaderRequest = {
  headers: {
    origin?: string | string[];
    host?: string | string[];
    'x-forwarded-host'?: string | string[];
    'x-forwarded-proto'?: string | string[];
  };
};

type HeaderResponse = {
  setHeader: (name: string, value: string | string[]) => void;
};

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function applyApiCorsHeaders(
  request: HeaderRequest,
  response: HeaderResponse,
  methods: string[]
) {
  const origin = firstHeader(request.headers.origin);
  const forwardedHost = firstHeader(request.headers['x-forwarded-host']);
  const host = (forwardedHost || firstHeader(request.headers.host) || '').split(',')[0].trim();
  const forwardedProto = firstHeader(request.headers['x-forwarded-proto']);
  const protocol = (forwardedProto || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https'))
    .split(',')[0]
    .trim();
  const requestOrigin = host ? `${protocol}://${host}` : null;
  const configuredOrigins = (process.env.API_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const originAllowed = !origin || origin === requestOrigin || configuredOrigins.includes(origin);

  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Max-Age', '600');

  if (origin && originAllowed) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  }

  return originAllowed;
}

export function applyApiSecurityHeaders(response: HeaderResponse) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
}
