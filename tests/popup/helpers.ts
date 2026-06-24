import type { Page } from '@playwright/test';
import { startOptionsServer, type OptionsServer } from '../options/helpers';
import type { ExtensionOptions } from '../../src/lib/options';

export { startOptionsServer };
export type { OptionsServer };

export function popupUrl(server: OptionsServer): string {
  return server.url.replace('/options.html', '/popup.html');
}

interface PopupChromeConfig {
  url: string;
  options?: ExtensionOptions;
  granted?: string[];
  grantRequests?: boolean;
}

export async function installPopupChrome(page: Page, config: PopupChromeConfig): Promise<void> {
  await page.addInitScript((pageConfig: PopupChromeConfig) => {
    const store: Record<string, unknown> = {};
    if (pageConfig.options) {
      store.options = pageConfig.options;
    }

    const granted = new Set<string>(pageConfig.granted ?? []);
    const grantRequests = pageConfig.grantRequests ?? true;
    const calls = { openOptionsPage: 0, requested: [] as string[], removed: [] as string[] };
    (globalThis as unknown as { __popup: typeof calls }).__popup = calls;

    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        sync: {
          get: (key: string) => Promise.resolve(key in store ? { [key]: store[key] } : {}),
          set: (items: Record<string, unknown>) => {
            Object.assign(store, items);

            return Promise.resolve();
          },
        },
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve(),
        },
        onChanged: { addListener: () => {}, removeListener: () => {} },
      },
      tabs: {
        query: () => Promise.resolve([{ url: pageConfig.url }]),
      },
      permissions: {
        contains: (request: { origins?: string[] }) =>
          Promise.resolve((request.origins ?? []).every((origin) => granted.has(origin))),
        request: (request: { origins?: string[] }) => {
          calls.requested.push(...(request.origins ?? []));

          if (grantRequests) {
            (request.origins ?? []).forEach((origin) => granted.add(origin));
          }

          return Promise.resolve(grantRequests);
        },
        remove: (request: { origins?: string[] }) => {
          calls.removed.push(...(request.origins ?? []));

          return Promise.resolve(true);
        },
      },
      runtime: {
        openOptionsPage: () => {
          calls.openOptionsPage += 1;
        },
      },
    };
  }, config);
}
