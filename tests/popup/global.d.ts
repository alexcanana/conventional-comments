declare global {
  interface Window {
    __popup: { openOptionsPage: number; requested: string[]; removed: string[] };
  }
}

export {};
