import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Sheet from './Sheet';
import { useSheet } from './useSheet';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Shown before the label, in the button and in the list (e.g. a student's avatar). */
  icon?: ReactNode;
  /** A second, quieter line under the label in the list. */
  hint?: string;
}

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-slate-400"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}

/**
 * The app's dropdown. A button showing the current choice; tapping it opens the options in a
 * sheet with full-size rows, instead of the browser's own select menu.
 *
 * Pass `label` for a visible label above it, or `ariaLabel` when the surrounding text already
 * says what it is.
 */
export default function Select<T extends string>({
  value, options, onChange, label, ariaLabel, size = 'md', className = '',
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const valueId = useId();
  const current = options.find(o => o.value === value);
  return (
    <div className={className}>
      {label && <span id={labelId} className="block text-sm text-slate-500">{label}</span>}
      <button type="button" aria-haspopup="listbox" aria-expanded={open}
        aria-label={label ? undefined : ariaLabel && `${ariaLabel}: ${current?.label ?? ''}`}
        aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-2 rounded-xl border border-slate-300 bg-white text-left text-slate-900 transition active:bg-slate-50 ${
          size === 'sm' ? 'min-h-9 pl-3 pr-2 text-sm' : 'min-h-11 pl-3 pr-2.5'} ${label ? 'mt-1' : ''}`}>
        {current?.icon}
        <span id={valueId} className="min-w-0 flex-1 truncate">{current?.label ?? 'Choose…'}</span>
        <Chevron />
      </button>
      {open && (
        <Picker title={label ?? ariaLabel ?? 'Choose'} value={value} options={options}
          onPick={onChange} onClosed={() => setOpen(false)} />
      )}
    </div>
  );
}

function Picker<T extends string>({ title, value, options, onPick, onClosed }: {
  title: string; value: T; options: SelectOption<T>[];
  onPick: (value: T) => void; onClosed: () => void;
}) {
  const { close, bind } = useSheet(onClosed);
  const selected = useRef<HTMLButtonElement>(null);
  // In a long list, start with the current choice in view.
  useEffect(() => { selected.current?.scrollIntoView({ block: 'center' }); }, []);
  return (
    <Sheet {...bind} title={title}>
      <ul role="listbox" aria-label={title} className="space-y-1">
        {options.map(o => {
          const on = o.value === value;
          return (
            <li key={o.value} role="presentation">
              <button type="button" role="option" aria-selected={on} ref={on ? selected : undefined}
                onClick={() => { onPick(o.value); close(); }}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  on ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-800 active:bg-slate-100'}`}>
                {o.icon}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="block truncate text-xs font-normal text-slate-500">{o.hint}</span>}
                </span>
                {on && (
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none"
                    stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
