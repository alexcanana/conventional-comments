import { test, expect } from '@playwright/test';
import {
  buildRegistration,
  syncRegistration,
  addGrantedOrigins,
} from '../../src/background/service-worker';
import { DEFAULT_OPTIONS } from '../../src/lib/options';

function installScriptingMock() {
  const registered: { id: string; matches: string[] }[] = [];
  (globalThis as unknown as { chrome: unknown }).chrome = {
    scripting: {
      async getRegisteredContentScripts({ ids }: { ids: string[] }) {
        return registered.filter((script) => ids.includes(script.id));
      },
      async registerContentScripts(scripts: { id: string; matches: string[] }[]) {
        registered.push(...scripts);
      },
      async unregisterContentScripts({ ids }: { ids: string[] }) {
        for (let i = registered.length - 1; i >= 0; i--) {
          if (ids.includes(registered[i].id)) {
            registered.splice(i, 1);
          }
        }
      },
    },
  };

  return registered;
}

test('buildRegistration targets the stored origins with the content script + css', () => {
  const registration = buildRegistration(['https://github.com/*']);
  expect(registration.id).toBe('cc-content');
  expect(registration.matches).toEqual(['https://github.com/*']);
  expect(registration.js).toEqual(['content.js']);
  expect(registration.css).toEqual(['dropdown.css']);
});

test('syncRegistration registers once, then replaces on the next sync', async () => {
  const registered = installScriptingMock();
  await syncRegistration(DEFAULT_OPTIONS);
  expect(registered).toHaveLength(1);
  expect(registered[0].matches).toEqual(DEFAULT_OPTIONS.allowedOrigins);

  await syncRegistration({ ...DEFAULT_OPTIONS, allowedOrigins: ['https://github.com/*'] });
  expect(registered).toHaveLength(1);
  expect(registered[0].matches).toEqual(['https://github.com/*']);
});

test('syncRegistration with no origins leaves nothing registered', async () => {
  const registered = installScriptingMock();
  await syncRegistration({ ...DEFAULT_OPTIONS, allowedOrigins: [] });
  expect(registered).toHaveLength(0);
});

test('addGrantedOrigins only accepts canonical https host patterns', () => {
  const options = { ...DEFAULT_OPTIONS, allowedOrigins: [], disabledOrigins: [] };
  const updated = addGrantedOrigins(options, [
    'https://example.com/*',
    'http://insecure.com/*',
    'https://no-glob.com',
    'https://-bad.com/*',
  ]);

  expect(updated.allowedOrigins).toEqual(['https://example.com/*']);
});

test('syncRegistration serializes overlapping calls', async () => {
  const registered = installScriptingMock();

  // Fire two without awaiting the first: without a mutex both read the empty
  // registry and each push a registration (length 2), which the real API
  // rejects as "already registered".
  const first = syncRegistration(DEFAULT_OPTIONS);
  const second = syncRegistration({ ...DEFAULT_OPTIONS, allowedOrigins: ['https://github.com/*'] });
  await Promise.all([first, second]);

  expect(registered).toHaveLength(1);
  expect(registered[0].matches).toEqual(['https://github.com/*']);
});
