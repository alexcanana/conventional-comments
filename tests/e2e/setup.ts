import { test as setup } from '@playwright/test';
import { buildTempExtension } from './build-extension';

setup('build the temp extension from dist/chromium', () => {
  buildTempExtension();
});
