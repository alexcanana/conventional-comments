(() => {
  const platforms = window.GCC_PLATFORMS || {};
  const candidates = [platforms.gitlab, platforms.github].filter(Boolean);

  const selectedPlatform = candidates.find((platform) => {
    if (typeof platform.isSupportedPage !== 'function') {
      return false;
    }

    return platform.isSupportedPage(window.location.href);
  });

  if (!selectedPlatform) {
    return;
  }

  if (typeof window.initConventionalComments !== 'function') {
    return;
  }

  window.initConventionalComments(selectedPlatform);
})();
