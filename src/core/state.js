(() => {
  function createRuntimeState(fallbackTrigger) {
    return {
      currentTextarea: null,
      currentRange: null,
      currentFilter: '',
      activeIndex: 0,
      anchorPosition: null,
      mode: 'labels',
      selectedLabel: null,
      selectedDecorations: new Set(),
      triggerText: fallbackTrigger
    };
  }

  function resetSelectionState(state) {
    state.currentRange = null;
    state.currentFilter = '';
    state.activeIndex = 0;
    state.anchorPosition = null;
    state.mode = 'labels';
    state.selectedLabel = null;
    state.selectedDecorations = new Set();
  }

  function hideDropdown(dropdown, state) {
    dropdown.hidden = true;
    dropdown.innerHTML = '';
    resetSelectionState(state);
  }

  window.GCC_STATE_UTILS = {
    createRuntimeState,
    resetSelectionState,
    hideDropdown
  };
})();
