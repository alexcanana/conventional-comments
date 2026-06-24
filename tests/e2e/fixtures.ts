import { test as base, chromium, expect } from '@playwright/test';
import type { BrowserContext, Worker } from '@playwright/test';
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { tempExtensionDir } from './build-extension';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

export interface FixtureServer {
  url: (fixture: string) => string;
  close: () => Promise<void>;
}

function startFixtureServer(): Promise<FixtureServer> {
  const root = resolve(__dirname, '..', 'fixtures');
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url ?? '/').split('?')[0]).replace(/^\/+/, '');
    const filePath = join(root, requestPath);

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
        url: (fixture) => `http://localhost:${port}/${fixture}`,
        close: () => {
          server.closeAllConnections();

          return new Promise((done) => server.close(() => done()));
        },
      });
    });
  });
}

export const test = base.extend<{
  context: BrowserContext;
  serviceWorker: Worker;
  server: FixtureServer;
}>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: true,
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${tempExtensionDir}`,
        `--load-extension=${tempExtensionDir}`,
      ],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const isBackground = (worker: Worker): boolean => worker.url().includes('background.js');
    let worker = context.serviceWorkers().find(isBackground);

    while (!worker) {
      const candidate = await context.waitForEvent('serviceworker');

      if (isBackground(candidate)) {
        worker = candidate;
      }
    }

    await use(worker);
  },
  server: async ({}, use) => {
    const server = await startFixtureServer();
    await use(server);
    await server.close();
  },
});

export { expect };

export async function enableFixtureOrigin(serviceWorker: Worker): Promise<void> {
  await serviceWorker.evaluate(() =>
    chrome.storage.sync.set({ options: { allowedOrigins: ['http://localhost/*'] } }),
  );

  await expect
    .poll(
      () =>
        serviceWorker.evaluate(async () => {
          const scripts = await chrome.scripting.getRegisteredContentScripts({
            ids: ['cc-content'],
          });

          return scripts.some((script) => (script.matches ?? []).includes('http://localhost/*'));
        }),
      { timeout: 10000, message: 'content script never registered for the fixture origin' },
    )
    .toBe(true);
}
