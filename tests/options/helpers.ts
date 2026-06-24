import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import type { Page } from '@playwright/test';

type ChangeListener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => void;

// The served options page has no extension APIs, so inject a minimal in-memory
// chrome.storage. This lets the app load and lets store.update() resolve, so
// success/removed toasts fire against a real persistence round-trip.
export async function installPageChrome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const listeners: ChangeListener[] = [];
    const makeArea = (store: Record<string, unknown>, areaName: string) => ({
      get: (key: string) => Promise.resolve(key in store ? { [key]: store[key] } : {}),
      set: (items: Record<string, unknown>) => {
        const changes: Record<string, { newValue?: unknown }> = {};

        for (const [storageKey, storageValue] of Object.entries(items)) {
          store[storageKey] = storageValue;
          changes[storageKey] = { newValue: storageValue };
        }

        listeners.forEach((listener) => listener(changes, areaName));

        return Promise.resolve();
      },
    });

    const perms: { granted: string[]; removed: string[] } = { granted: [], removed: [] };
    (globalThis as unknown as { __perms: typeof perms }).__perms = perms;

    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        sync: makeArea({}, 'sync'),
        local: makeArea({}, 'local'),
        onChanged: {
          addListener: (listener: ChangeListener) => listeners.push(listener),
          removeListener: () => {},
        },
      },
      permissions: {
        request: (request: { origins?: string[] }) => {
          perms.granted.push(...(request.origins ?? []));

          return Promise.resolve(true);
        },
        remove: (request: { origins?: string[] }) => {
          perms.removed.push(...(request.origins ?? []));

          return Promise.resolve(true);
        },
      },
    };
  });
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.eot': 'application/vnd.ms-fontobject',
};

export interface OptionsServer {
  url: string;
  close: () => Promise<void>;
}

// ES-module scripts (what Vite emits) cannot load over file:// — browsers block
// them as cross-origin. Serve the built Options page over http for page tests.
export function startOptionsServer(): Promise<OptionsServer> {
  const root = resolve('dist/chromium');
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
    const filePath = join(root, requestPath === '/' ? 'options.html' : requestPath);

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      response.statusCode = 404;
      response.end('not found');

      return;
    }

    response.setHeader(
      'Content-Type',
      CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
    );
    response.end(readFileSync(filePath));
  });

  return new Promise((resolvePromise) => {
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      resolvePromise({
        url: `http://localhost:${port}/options.html`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}
