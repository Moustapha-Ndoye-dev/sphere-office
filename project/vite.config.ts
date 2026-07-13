import { defineConfig, loadEnv } from 'vite'
import type { Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { parse, pathToFileURL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'

type DevApiRequest = {
  method?: string;
  headers: {
    authorization?: string;
    origin?: string | string[];
    host?: string | string[];
    'x-forwarded-host'?: string | string[];
    'x-forwarded-proto'?: string | string[];
  };
  body?: unknown;
  query?: {
    id?: string | string[];
  };
};

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 32 * 1024) {
      throw new Error('Request body too large');
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody) {
    return undefined;
  }

  return JSON.parse(rawBody);
}

async function handleLocalApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  routeModulePath: string,
  requestQuery: { id?: string | string[]; orderId?: string | string[] }
) {
  const routeModule = await import(pathToFileURL(routeModulePath).href);
  const body = req.method && ['POST', 'PUT', 'PATCH'].includes(req.method)
    ? await readJsonBody(req)
    : undefined;

  const requestPayload: DevApiRequest = {
    method: req.method,
    headers: {
      authorization: req.headers.authorization,
      origin: req.headers.origin,
      host: req.headers.host,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
    },
    body,
    query: requestQuery,
  };

  const responsePayload = {
    setHeader: (name: string, value: string | string[]) => {
      res.setHeader(name, value);
    },
    status: (code: number) => ({
      json: (bodyData: unknown) => {
        res.statusCode = code;
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify(bodyData));
      },
      send: (bodyData: Uint8Array | Buffer | string) => {
        res.statusCode = code;
        res.end(bodyData);
      },
      end: () => {
        res.statusCode = code;
        res.end();
      },
    }),
  };

  await routeModule.handler(requestPayload, responsePayload);
}

function installLocalApiRoutes(middlewares: Connect.Server, rootDir: string) {
  middlewares.use('/api/users', async (req, res, next) => {
    if (!req.url) {
      next();
      return;
    }

    try {
      const parsedUrl = parse(req.url, true);
      await handleLocalApiRoute(
        req,
        res as ServerResponse,
        resolve(rootDir, 'api/users.ts'),
        parsedUrl.query as { id?: string | string[] }
      );
    } catch {
      (res as ServerResponse).statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  middlewares.use('/api/invoices/pdf', async (req, res, next) => {
    if (!req.url) {
      next();
      return;
    }

    try {
      const parsedUrl = parse(req.url, true);
      await handleLocalApiRoute(
        req,
        res as ServerResponse,
        resolve(rootDir, 'api/invoices/pdf.ts'),
        parsedUrl.query as { orderId?: string | string[] }
      );
    } catch {
      (res as ServerResponse).statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  middlewares.use('/api', async (req, res, next) => {
    if (!req.url) {
      next();
      return;
    }

    try {
      await handleLocalApiRoute(
        req,
        res as ServerResponse,
        resolve(rootDir, 'api/not-found.ts'),
        {}
      );
    } catch {
      (res as ServerResponse).statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rootDir = process.cwd();
  const mockSupabaseTarget = env.SPHERE_LOCAL_MOCK_SUPABASE_TARGET;
  process.env.VITE_SUPABASE_URL ||= env.VITE_SUPABASE_URL;
  process.env.SUPABASE_URL ||= env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= env.SUPABASE_SERVICE_ROLE_KEY;

  return {
  plugins: [
    react(),
    {
      name: 'local-api-routes',
      configureServer(server) {
        installLocalApiRoutes(server.middlewares, rootDir);
      },
      configurePreviewServer(server) {
        installLocalApiRoutes(server.middlewares, rootDir);
      },
    },
  ],
  server: {
    // Increase timeout to avoid the _onTimeout error
    hmr: {
      timeout: 5000
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    }
  },
  preview: {
    proxy: mockSupabaseTarget
      ? {
          '/mock-supabase': {
            target: mockSupabaseTarget,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/mock-supabase/, ''),
          },
        }
      : undefined,
  }
  };
})
