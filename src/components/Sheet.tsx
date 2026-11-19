import type { ReactNode } from 'react';

/** Bottom sheet on a phone, centered dialog on a wider screen. Tapping the backdrop closes it. */
export default function Sheet({ title, onClose, children }:
  { title: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5 text-left sm:rounded-2xl">
        <h3 className="text-lg font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/** A destructive action kept apart from Save and Cancel, so it is never hit by a near miss. */
export function DeleteRow({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <div className="border-t border-slate-200 pt-1">
      <button type="button" onClick={onDelete}
        className="min-h-11 w-full rounded-xl text-sm font-medium text-red-600">
        {label}
      </button>
    </div>
  );
}
