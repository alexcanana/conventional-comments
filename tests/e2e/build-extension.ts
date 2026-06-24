import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..', '..');
const distDir = resolve(root, 'dist', 'chromium');
export const tempExtensionDir = resolve(root, 'tests', '.e2e-ext');

export function buildTempExtension(): void {
  if (!existsSync(resolve(distDir, 'manifest.json'))) {
    throw new Error(
      'dist/chromium not found — run `bun run build` first (or use `bun run test:e2e`).',
    );
  }

  rmSync(tempExtensionDir, { recursive: true, force: true });
  cpSync(distDir, tempExtensionDir, { recursive: true });

  const manifestPath = resolve(tempExtensionDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    host_permissions?: string[];
  };
  const hostPermissions = new Set(manifest.host_permissions ?? []);
  hostPermissions.add('http://localhost/*');
  manifest.host_permissions = [...hostPermissions];
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
