/** Shared control styles, so every sheet's buttons and fields look and press the same. */
export const btnPrimary =
  'min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white transition active:scale-[0.98] active:bg-indigo-700 disabled:opacity-40';
export const btnSecondary =
  'min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-slate-700 transition active:bg-slate-100';
export const btnOutline =
  'min-h-11 rounded-xl border border-indigo-600 bg-white px-4 font-semibold text-indigo-700 transition active:bg-indigo-50';
export const field =
  'mt-1 w-full min-h-11 rounded-xl border border-slate-300 bg-white p-3 text-slate-900';
export const choice = (on: boolean) =>
  `min-h-11 rounded-xl border p-2 text-sm font-medium transition ${
    on ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-white active:bg-slate-100'}`;
export const chip = (on: boolean) =>
  `min-h-11 rounded-full border px-4 text-sm transition ${
    on ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-white active:bg-slate-100'}`;
