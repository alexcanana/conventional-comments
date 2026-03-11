(() => {
  function bindTextarea(textarea, options) {
    const {
      boundAttribute,
      isSupportedTextarea,
      onUpdateDropdown,
      onKeyDown,
      onHideDropdown,
      shouldSkipKeyup
    } = options;

    if (typeof isSupportedTextarea === 'function' && !isSupportedTextarea(textarea)) {
      return;
    }

    if (textarea.getAttribute(boundAttribute) === '1') {
      return;
    }

    textarea.setAttribute(boundAttribute, '1');

    textarea.addEventListener('input', () => onUpdateDropdown(textarea));
    textarea.addEventListener('click', () => onUpdateDropdown(textarea));
    textarea.addEventListener('keyup', (event) => {
      if (typeof shouldSkipKeyup === 'function' && shouldSkipKeyup(event)) {
        return;
      }

      if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
        onUpdateDropdown(textarea);
      }
    });

    textarea.addEventListener('keydown', onKeyDown, true);

    textarea.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== textarea) {
          onHideDropdown();
        }
      }, 0);
    });
  }

  function bindExistingTextareas(textareaSelector, bindTextareaFn) {
    const textareas = document.querySelectorAll(textareaSelector);
    textareas.forEach((textarea) => bindTextareaFn(textarea));
  }

  function bindPotentialTextareaNode(node, textareaSelector, bindTextareaFn) {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (node.tagName === 'TEXTAREA') {
      if (node.matches && node.matches(textareaSelector)) {
        bindTextareaFn(node);
      }
      return;
    }

    if (node.matches && node.matches(textareaSelector)) {
      bindTextareaFn(node);
      return;
    }

    if (!node.firstElementChild) {
      return;
    }

    if (!node.querySelector('textarea')) {
      return;
    }

    const nested = node.querySelectorAll(textareaSelector);
    nested.forEach((textarea) => bindTextareaFn(textarea));
  }

  function installObserver(textareaSelector, bindTextareaFn) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          bindPotentialTextareaNode(node, textareaSelector, bindTextareaFn);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  function installRepositionHandlers(onReposition) {
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);

    return function removeRepositionHandlers() {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }

  window.GCC_BINDING_UTILS = {
    bindTextarea,
    bindExistingTextareas,
    bindPotentialTextareaNode,
    installObserver,
    installRepositionHandlers
  };
})();
