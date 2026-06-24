const MIRROR_ID = 'cc-caret-mirror';

// Style properties copied from the textarea onto the mirror so text wraps and
// lays out identically.
const COPIED_PROPERTIES = [
  'boxSizing',
  'width',
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
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'wordBreak',
];

// The mirror is held by reference rather than looked up by id, so a
// page-controlled element sharing the id can't capture the styles/text we
// write into it.
let mirror: HTMLDivElement | null = null;

// Returns the caret's pixel position relative to the textarea's top-left
// border edge, using a hidden mirror element that replicates the textarea's
// text layout (textareas don't expose caret coordinates natively).
export function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; height: number } {
  if (!mirror || !mirror.isConnected) {
    mirror = document.createElement('div');
    mirror.id = MIRROR_ID;
    document.body.appendChild(mirror);
  }

  const computedStyle = window.getComputedStyle(textarea);
  const mirrorStyle = mirror.style;
  mirrorStyle.position = 'absolute';
  mirrorStyle.visibility = 'hidden';
  mirrorStyle.top = '0';
  mirrorStyle.left = '-9999px';
  mirrorStyle.overflow = 'hidden';
  for (const property of COPIED_PROPERTIES) {
    (mirrorStyle as unknown as Record<string, string>)[property] = (
      computedStyle as unknown as Record<string, string>
    )[property];
  }

  mirrorStyle.whiteSpace = 'pre-wrap';
  mirrorStyle.wordWrap = 'break-word';

  mirror.textContent = textarea.value.slice(0, position);
  const marker = document.createElement('span');
  // Non-empty content so the marker has a measurable box at the caret.
  marker.textContent = textarea.value.slice(position) || '.';
  mirror.appendChild(marker);

  const lineHeight =
    parseInt(computedStyle.lineHeight, 10) ||
    Math.round(parseInt(computedStyle.fontSize, 10) * 1.2);

  const coordinates = {
    top: marker.offsetTop + parseInt(computedStyle.borderTopWidth, 10),
    left: marker.offsetLeft + parseInt(computedStyle.borderLeftWidth, 10),
    height: lineHeight,
  };

  mirror.textContent = '';

  return coordinates;
}
