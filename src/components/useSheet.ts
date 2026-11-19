import { useCallback, useRef, useState } from 'react';

/**
 * State for one <Sheet>. `close()` plays the sheet's exit and then calls `onClosed`, which is
 * where the parent actually unmounts it. Spread `bind` onto the Sheet.
 *
 * The sheet notices typing by itself and asks before a tap outside throws it away; call
 * `markClean()` after saving without closing (e.g. "Save & add another").
 */
export function useSheet(onClosed: () => void) {
  const [closing, setClosing] = useState(false);
  const dirty = useRef(false);
  const close = useCallback(() => setClosing(true), []);
  const markClean = useCallback(() => { dirty.current = false; }, []);
  return { close, markClean, bind: { closing, close, onClosed, dirty } };
}

export type SheetBind = ReturnType<typeof useSheet>['bind'];
