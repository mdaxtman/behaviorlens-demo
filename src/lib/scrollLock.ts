let locks = 0;
let previous: [string, string] = ['', ''];

/**
 * Stop the page behind a sheet from scrolling. Counted, so stacked sheets release it only when
 * the last one closes. Returns the function that releases this lock.
 *
 * Both the root element and the body are locked: which of the two a mobile browser treats as
 * the page scroller has varied between versions.
 */
export function lockScroll(): () => void {
  const root = document.documentElement.style;
  const body = document.body.style;
  if (locks++ === 0) {
    previous = [root.overflow, body.overflow];
    root.overflow = 'hidden';
    body.overflow = 'hidden';
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) [root.overflow, body.overflow] = previous;
  };
}
