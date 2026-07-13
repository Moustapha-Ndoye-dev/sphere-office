import { applyApiCorsHeaders, applyApiSecurityHeaders } from './_httpSecurity.ts';

type ApiRequest = {
  method?: string;
  headers: {
    origin?: string | string[];
    host?: string | string[];
    'x-forwarded-host'?: string | string[];
    'x-forwarded-proto'?: string | string[];
  };
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    end: () => void;
  };
};

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function handler(request: ApiRequest, response: ApiResponse) {
  applyApiSecurityHeaders(response);
  response.setHeader('Content-Type', 'application/json');

  if (!applyApiCorsHeaders(request, response, METHODS)) {
    response.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.setHeader('Allow', [...METHODS, 'OPTIONS']);
    response.status(204).end();
    return;
  }

  response.status(404).json({ error: 'API route not found' });
}

export default handler;
