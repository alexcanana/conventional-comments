export async function requestOrigin(pattern: string): Promise<boolean> {
  return chrome.permissions.request({ origins: [pattern] });
}

export async function removeOrigin(pattern: string): Promise<void> {
  await chrome.permissions.remove({ origins: [pattern] });
}
