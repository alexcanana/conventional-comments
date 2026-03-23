(() => {
  function ensureActiveItemVisible(dropdown) {
    const list = dropdown.querySelector('.gl-cc-list');
    const activeItem = dropdown.querySelector('.gl-cc-item.active');

    if (!list || !activeItem) {
      return;
    }

    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;

    if (itemTop < viewTop) {
      list.scrollTop = itemTop;
      return;
    }

    if (itemBottom > viewBottom) {
      list.scrollTop = itemBottom - list.clientHeight;
    }
  }

  function applyListViewportHeight(dropdown, visibleRows = 5.4) {
    const list = dropdown.querySelector('.gl-cc-list');
    const firstItem = dropdown.querySelector('.gl-cc-item');

    if (!list || !firstItem) {
      return;
    }

    const itemHeight = firstItem.offsetHeight;
    const style = getComputedStyle(list);
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
    const targetHeight = (itemHeight * visibleRows) + paddingTop + paddingBottom;

    let maxHeight = targetHeight;
    const dropdownMaxHeight = Number.parseFloat(dropdown.style.maxHeight);
    if (!Number.isNaN(dropdownMaxHeight) && dropdownMaxHeight > 0) {
      const available = dropdownMaxHeight - paddingTop - paddingBottom - 8;
      maxHeight = Math.min(targetHeight, Math.max((itemHeight * 2) + paddingTop + paddingBottom, available));
    }

    list.style.maxHeight = `${Math.ceil(maxHeight)}px`;
    list.style.overflowY = 'auto';
  }

  function renderLabels(options) {
    const {
      dropdown,
      items,
      activeIndex,
      onChooseLabel,
      visibleRows,
      showDescriptions = true
    } = options;

    if (items.length === 0) {
      dropdown.hidden = true;
      dropdown.innerHTML = '';
      return 0;
    }

    const nextActiveIndex = ((activeIndex % items.length) + items.length) % items.length;

    const listMarkup = items.map((item, index) => {
      const activeClass = index === nextActiveIndex ? ' active' : '';
      const descriptionMarkup =
        showDescriptions === false
          ? ''
          : `<span class="gl-cc-description">${item.description}</span>`;
      return `<li class="gl-cc-item${activeClass}" data-index="${index}" data-key="${item.key}">
        <span class="gl-cc-marker">${item.key}</span>
        ${descriptionMarkup}
      </li>`;
    }).join('');

    dropdown.innerHTML = `<ul class="gl-cc-list" role="listbox" aria-label="Conventional labels">${listMarkup}</ul>`;
    dropdown.hidden = false;

    const optionElements = Array.from(dropdown.querySelectorAll('.gl-cc-item'));
    const activeOptionId = `gl-cc-label-option-${nextActiveIndex}`;
    const list = dropdown.querySelector('.gl-cc-list');
    if (list) {
      list.setAttribute('aria-activedescendant', activeOptionId);
    }

    optionElements.forEach((element, index) => {
      const optionId = `gl-cc-label-option-${index}`;
      element.id = optionId;
      element.setAttribute('role', 'option');
      element.setAttribute('aria-selected', index === nextActiveIndex ? 'true' : 'false');
    });

    if (list) {
      list.addEventListener('mousedown', (event) => {
        const item = event.target instanceof Element ? event.target.closest('.gl-cc-item') : null;
        if (!item) {
          return;
        }

        event.preventDefault();
        const itemIndex = Number.parseInt(item.getAttribute('data-index') || '0', 10);
        onChooseLabel(Number.isNaN(itemIndex) ? 0 : itemIndex);
      });
    }

    applyListViewportHeight(dropdown, visibleRows);
    ensureActiveItemVisible(dropdown);

    return nextActiveIndex;
  }

  function renderDecorations(options) {
    const {
      dropdown,
      items,
      activeIndex,
      selectedDecorations,
      onToggleDecoration,
      visibleRows,
      showDescriptions = true
    } = options;

    if (items.length === 0) {
      dropdown.hidden = true;
      dropdown.innerHTML = '';
      return 0;
    }

    const nextActiveIndex = ((activeIndex % items.length) + items.length) % items.length;

    const listMarkup = items.map((item, index) => {
      const activeClass = index === nextActiveIndex ? ' active' : '';
      const selected = selectedDecorations.has(item.key);
      const selectedClass = selected ? ' selected' : '';
      const checked = selected ? ' checked' : '';
      const descriptionMarkup =
        showDescriptions === false
          ? ''
          : `<span class="gl-cc-description">${item.description}</span>`;
      return `<li class="gl-cc-item${activeClass}${selectedClass}" data-index="${index}" data-key="${item.key}">
        <input type="checkbox" class="gl-cc-checkbox" aria-label="${item.key}" tabindex="-1"${checked} />
        <span class="gl-cc-marker">${item.key}</span>
        ${descriptionMarkup}
      </li>`;
    }).join('');

    dropdown.innerHTML = `<ul class="gl-cc-list" role="listbox" aria-label="Decoration options" aria-multiselectable="true">${listMarkup}</ul>`;
    dropdown.hidden = false;

    const optionElements = Array.from(dropdown.querySelectorAll('.gl-cc-item'));
    const activeOptionId = `gl-cc-decoration-option-${nextActiveIndex}`;
    const list = dropdown.querySelector('.gl-cc-list');
    if (list) {
      list.setAttribute('aria-activedescendant', activeOptionId);
    }

    optionElements.forEach((element, index) => {
      const item = items[index];
      const selected = Boolean(item && selectedDecorations.has(item.key));
      const optionId = `gl-cc-decoration-option-${index}`;
      element.id = optionId;
      element.setAttribute('role', 'option');
      element.setAttribute('aria-selected', selected ? 'true' : 'false');
    });

    if (list) {
      list.addEventListener('mousedown', (event) => {
        if (event.target instanceof HTMLElement && event.target.closest('.gl-cc-checkbox')) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        const item = event.target instanceof Element ? event.target.closest('.gl-cc-item') : null;
        if (!item) {
          return;
        }

        event.preventDefault();
        const itemIndex = Number.parseInt(item.getAttribute('data-index') || '0', 10);
        onToggleDecoration(Number.isNaN(itemIndex) ? 0 : itemIndex);
      });

      list.addEventListener('click', (event) => {
        const checkbox = event.target instanceof Element ? event.target.closest('.gl-cc-checkbox') : null;
        if (!checkbox) {
          return;
        }

        const item = checkbox.closest('.gl-cc-item');
        if (!item) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        const itemIndex = Number.parseInt(item.getAttribute('data-index') || '0', 10);
        onToggleDecoration(Number.isNaN(itemIndex) ? 0 : itemIndex);
      });
    }

    applyListViewportHeight(dropdown, visibleRows);
    ensureActiveItemVisible(dropdown);

    return nextActiveIndex;
  }

  window.GCC_RENDER_UTILS = {
    ensureActiveItemVisible,
    applyListViewportHeight,
    renderLabels,
    renderDecorations
  };
})();
