(() => {
  function positionDropdown(dropdown, textarea, caretPosition) {
    const safeCaretPosition = Number.isInteger(caretPosition)
      ? caretPosition
      : (textarea.selectionEnd || 0);
    const caret = getCaretCoordinates(textarea, safeCaretPosition);
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    dropdown.style.left = '0px';
    dropdown.style.top = '0px';
    dropdown.style.width = '380px';
    dropdown.style.maxHeight = '320px';

    const rect = dropdown.getBoundingClientRect();

    const maxWidth = Math.max(280, Math.min(420, viewportWidth - margin * 2));
    const width = Math.min(maxWidth, rect.width || maxWidth);
    dropdown.style.width = `${width}px`;

    const measuredRect = dropdown.getBoundingClientRect();
    const dropdownHeight = measuredRect.height || 320;

    const spaceBelow = viewportHeight - caret.bottom;
    const spaceAbove = caret.top;
    const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const desiredTop = placeAbove
      ? Math.max(margin, caret.top - dropdownHeight - 6)
      : Math.min(viewportHeight - margin - dropdownHeight, caret.bottom + 6);
    const desiredLeft = Math.max(margin, Math.min(caret.left, viewportWidth - margin - width));

    const maxHeight = placeAbove
      ? Math.max(140, spaceAbove - 18)
      : Math.max(140, spaceBelow - 18);

    dropdown.style.maxHeight = `${Math.floor(maxHeight)}px`;
    dropdown.style.left = `${Math.round(desiredLeft)}px`;
    dropdown.style.top = `${Math.round(desiredTop)}px`;
  }

  function getCaretCoordinates(textarea, position) {
    const div = document.createElement('div');
    const style = getComputedStyle(textarea);
    const properties = [
      'boxSizing',
      'width',
      'height',
      'overflowX',
      'overflowY',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'fontStyle',
      'fontVariant',
      'fontWeight',
      'fontStretch',
      'fontSize',
      'fontSizeAdjust',
      'lineHeight',
      'fontFamily',
      'textAlign',
      'textTransform',
      'textIndent',
      'textDecoration',
      'letterSpacing',
      'wordSpacing',
      'tabSize',
      'MozTabSize'
    ];

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';

    properties.forEach((property) => {
      div.style[property] = style[property];
    });

    div.textContent = textarea.value.slice(0, position);
    const span = document.createElement('span');
    span.textContent = textarea.value.slice(position) || '.';
    div.appendChild(span);

    document.body.appendChild(div);

    const textareaRect = textarea.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();

    const left = textareaRect.left + (spanRect.left - div.getBoundingClientRect().left) - textarea.scrollLeft;
    const top = textareaRect.top + (spanRect.top - div.getBoundingClientRect().top) - textarea.scrollTop;

    document.body.removeChild(div);

    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.4 || 18;

    return {
      left,
      top,
      bottom: top + lineHeight
    };
  }

  window.GCC_POSITION_UTILS = {
    positionDropdown,
    getCaretCoordinates
  };
})();
