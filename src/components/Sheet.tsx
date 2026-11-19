import {
  useEffect, useId, useRef, useState,
  type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { lockScroll } from '../lib/scrollLock';
import { btnPrimary, btnSecondary } from './styles';
import type { SheetBind } from './useSheet';

/** Matches the exit transition in index.css. */
const CLOSE_MS = 220;
/** Drag the sheet further than this (px), or flick it, and it closes. */
const DRAG_CLOSE = 110;

/** Open sheets, oldest first. Only the last one answers the keyboard. */
const stack: symbol[] = [];

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),'
  + 'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet on a phone, centered dialog on a wider screen.
 *
 * - Slides in and out; the page behind does not scroll while it is open.
 * - Closes by tapping outside, the ✕, Escape, or dragging the handle down. If something was
 *   typed, those ask before throwing it away (Cancel and Save buttons never ask).
 * - The title stays at the top and `footer` (the Save row) stays at the bottom while the
 *   content between them scrolls.
 *
 * State comes from useSheet(): `<Sheet {...bind} title="…">`.
 */
export default function Sheet({ title, children, footer, onDismiss, closing, close, onClosed, dirty }: SheetBind & {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Runs when the user backs out (not via the sheet's own buttons), just before it closes. */
  onDismiss?: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const titleId = useId();

  function discard() {
    onDismiss?.();
    close();
  }
  /** The user is backing out. Ask first if that would lose what they typed. */
  function dismiss() {
    if (closing || confirming) return;
    if (dirty.current) setConfirming(true);
    else discard();
  }

  // Latest callbacks for the listeners and timers below, which are set up once.
  const latest = useRef({ dismiss, onClosed });
  useEffect(() => { latest.current = { dismiss, onClosed }; });

  useEffect(() => {
    const token = Symbol('sheet');
    stack.push(token);
    const unlock = lockScroll();
    const previous = document.activeElement as HTMLElement | null;
    // Leave focus alone if a field inside asked for it (autoFocus); otherwise take it, so the
    // keyboard and screen readers are in the sheet rather than on the page behind.
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true });

    // Two frames: the first paints the off-screen starting position, the second animates from it.
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setEntered(true)); });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token || !panel.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        latest.current.dismiss();
      } else if (e.key === 'Tab') {
        // Keep Tab inside the sheet.
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
          .filter(el => el.offsetParent !== null);
        if (items.length === 0) { e.preventDefault(); return; }
        const firstItem = items[0], lastItem = items[items.length - 1];
        const at = document.activeElement;
        if (!panel.current.contains(at) || at === panel.current) {
          e.preventDefault();
          (e.shiftKey ? lastItem : firstItem).focus();
        } else if (e.shiftKey && at === firstItem) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && at === lastItem) {
          e.preventDefault();
          firstItem.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);

    // A swipe that starts on the sheet must never move the page behind it. The lock above
    // covers most browsers; this covers touch browsers that scroll the page anyway when the
    // finger is on something that cannot itself scroll (the title, the footer, a short sheet).
    const root = container.current;
    const onTouchMove = (e: TouchEvent) => {
      for (let el = e.target as HTMLElement | null; el && el !== root; el = el.parentElement) {
        if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY)) return;
      }
      if (e.cancelable) e.preventDefault();
    };
    root?.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      document.removeEventListener('keydown', onKey);
      root?.removeEventListener('touchmove', onTouchMove);
      stack.splice(stack.indexOf(token), 1);
      unlock();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  // Let the exit play, then tell the parent to unmount.
  useEffect(() => {
    if (!closing) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => latest.current.onClosed(), still ? 0 : CLOSE_MS);
    return () => clearTimeout(t);
  }, [closing]);

  // ---- Drag the header down to close (phone layout only) ----
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (closing || e.button !== 0 || (e.target as Element).closest('button')) return;
    if (!window.matchMedia('(max-width: 639.98px)').matches) return;
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || !panel.current) return;
    d.dy = Math.max(0, e.clientY - d.y);
    panel.current.dataset.dragging = 'true';
    panel.current.style.transform = `translateY(${d.dy}px)`;
    if (backdrop.current) backdrop.current.style.opacity = String(Math.max(0.35, 1 - d.dy / 500));
  }
  function onPointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d || !panel.current) return;
    delete panel.current.dataset.dragging;
    const speed = d.dy / Math.max(1, e.timeStamp - d.t); // px per ms
    const far = e.type === 'pointerup' && (d.dy > DRAG_CLOSE || (d.dy > 30 && speed > 0.6));
    if (far && !dirty.current) {
      // Carry on down from where the finger let go.
      panel.current.style.transform = 'translateY(100%)';
      if (backdrop.current) backdrop.current.style.opacity = '0';
      discard();
      return;
    }
    panel.current.style.transform = '';
    if (backdrop.current) backdrop.current.style.opacity = '';
    if (far) setConfirming(true);
  }

  return createPortal(
    <div ref={container} data-open={entered && !closing} inert={closing}
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <div ref={backdrop} aria-hidden="true" onClick={dismiss}
        className="sheet-backdrop absolute inset-0 touch-none bg-slate-900/50" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        onInput={() => { dirty.current = true; }}
        className="sheet-panel relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-white text-left text-base font-normal text-slate-900 shadow-2xl outline-none sm:max-h-[85dvh] sm:rounded-2xl">
        <div onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
          className="shrink-0 touch-none select-none px-5 pb-3 pt-2.5 sm:pt-5">
          <div aria-hidden="true" className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <h3 id={titleId} className="min-w-0 pt-0.5 text-lg font-bold">{title}</h3>
            <button type="button" aria-label="Close" onClick={dismiss}
              className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition active:bg-slate-200">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pt-1 ${
          footer || confirming ? 'pb-4' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'}`}>
          {children}
        </div>

        {confirming ? (
          <div role="alertdialog" aria-label="Discard changes?"
            className="slide-down shrink-0 space-y-2 border-t border-amber-200 bg-amber-50 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="text-sm font-medium text-amber-900">Close without saving what you entered?</p>
            <div className="flex gap-2">
              <button type="button" autoFocus onClick={() => setConfirming(false)} className={`${btnPrimary} flex-1`}>
                Keep editing
              </button>
              <button type="button" onClick={discard} className={`${btnSecondary} flex-1`}>Discard</button>
            </div>
          </div>
        ) : footer && (
          <div className="shrink-0 space-y-2 border-t border-slate-200 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** A destructive action kept apart from Save and Cancel, so it is never hit by a near miss. */
export function DeleteRow({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <div className="border-t border-slate-200 pt-1">
      <button type="button" onClick={onDelete}
        className="min-h-11 w-full rounded-xl text-sm font-medium text-red-600 transition active:bg-red-50">
        {label}
      </button>
    </div>
  );
}
