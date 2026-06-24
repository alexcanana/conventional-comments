import type { Entry } from './entries';

// Conventional Comments decorations, from https://conventionalcomments.org/.
export const DECORATIONS: Entry[] = [
  { label: 'non-blocking', description: 'No action required to merge.' },
  { label: 'blocking', description: 'Must be addressed before merge.' },
  { label: 'if-minor', description: 'Ignore if this is intentionally small scope.' },
  { label: 'security', description: 'Security-sensitive concern.' },
  { label: 'test', description: 'Related to tests or verification.' },
  { label: 'ux', description: 'User experience concern.' },
  { label: 'performance', description: 'Performance-sensitive concern.' },
];
