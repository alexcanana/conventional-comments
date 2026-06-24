import { test, expect } from '@playwright/test';
import { requestOrigin, removeOrigin } from '../../src/options/composables/useOriginPermissions';

function installPermissionsMock(grant: boolean) {
  const calls: { request: string[]; remove: string[] } = { request: [], remove: [] };
  (globalThis as unknown as { chrome: unknown }).chrome = {
    permissions: {
      async request({ origins }: { origins: string[] }) {
        calls.request.push(...origins);

        return grant;
      },
      async remove({ origins }: { origins: string[] }) {
        calls.remove.push(...origins);

        return true;
      },
    },
  };

  return calls;
}

test('requestOrigin returns true on grant and false on denial', async () => {
  installPermissionsMock(true);
  expect(await requestOrigin('https://example.com/*')).toBe(true);
  installPermissionsMock(false);
  expect(await requestOrigin('https://example.com/*')).toBe(false);
});

test('removeOrigin calls permissions.remove', async () => {
  const calls = installPermissionsMock(true);
  await removeOrigin('https://example.com/*');
  expect(calls.remove).toEqual(['https://example.com/*']);
});
