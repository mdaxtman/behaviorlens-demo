import { uuid } from '../lib/id';
import { useState, type FormEvent } from 'react';
import { DeleteRow } from './Sheet';
import { useData } from '../lib/store';
import type { Goal } from '../lib/types';

/** Create or edit one student's goal. Shared by Manage → Goals and a student's Goals tab. */
export default function GoalForm({ goal, studentId, onClose }:
  { goal: Goal | null; studentId: string; onClose: () => void }) {
  const { students, behaviors, save, removeRow } = useData();
  const code = students.find(s => s.id === studentId)?.code;
  const options = behaviors.filter(b => b.student_id === studentId && b.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [mode, setMode] = useState<Goal['mode']>(goal?.mode ?? 'direct');
  const [behaviorIds, setBehaviorIds] = useState<string[]>(goal?.behavior_ids ?? []);
  const [direction, setDirection] = useState<'at_most' | 'at_least'>(goal?.criterion_direction ?? 'at_most');
  const [value, setValue] = useState(goal?.criterion_value?.toString() ?? '');
  const [metric, setMetric] = useState<NonNullable<Goal['criterion_metric']>>(goal?.criterion_metric ?? 'count_per_day');
  const [percent, setPercent] = useState(goal?.criterion_percent?.toString() ?? '80');
  const [baseline, setBaseline] = useState(goal?.baseline ?? '');
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '');
  const [active, setActive] = useState(goal?.active ?? true);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const row: Goal = {
      id: goal?.id ?? uuid(),
      student_id: studentId,
      title: title.trim(),
      description: description.trim() || null,
      mode,
      behavior_ids: mode === 'linked' ? behaviorIds : [],
      criterion_direction: mode === 'linked' ? direction : null,
      criterion_value: mode === 'linked' && value !== '' ? Number(value) : null,
      criterion_metric: mode === 'linked' ? metric : null,
      criterion_percent: mode === 'direct' && percent !== '' ? Number(percent) : null,
      baseline: baseline.trim() || null,
      target_date: targetDate || null,
      active,
      created_at: goal?.created_at ?? new Date().toISOString(),
    };
    await save('goals', row);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <form onSubmit={e => void submit(e)} onClick={e => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5 text-left sm:rounded-2xl">
        <h3 className="text-lg font-bold">
          {goal ? 'Edit goal' : 'New goal'}{code && <span className="font-normal text-slate-400"> for {code}</span>}
        </h3>
        <label className="block text-sm text-slate-500">Goal title
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fewer aggressions"
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
        </label>
        <label className="block text-sm text-slate-500">IEP goal text <span className="text-slate-400">(optional)</span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-slate-900" />
          <span className="mt-1 block text-xs text-slate-400">Included in generated prompts — avoid real names.</span>
        </label>
        <div>
          <div className="mb-1 text-sm text-slate-500">How progress is measured</div>
          <div className="flex gap-2">
            {(['direct', 'linked'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`min-h-11 flex-1 rounded-xl border p-2 text-sm font-medium ${
                  mode === m ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}>
                {m === 'direct' ? 'Trial entry (✓/✗)' : 'Linked to behavior data'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {mode === 'direct'
              ? 'You tap ✓ or ✗ for each opportunity on the Goals tab.'
              : 'Nothing extra to record: progress comes from the behaviors you already track.'}
          </p>
        </div>
        {mode === 'direct' ? (
          <label className="flex items-center gap-2 text-sm">
            Target: at least
            <input type="number" min={1} max={100} value={percent}
              onChange={e => setPercent(e.target.value)}
              className="w-20 min-h-11 rounded-xl border border-slate-300 p-2 text-center" />
            % of opportunities
          </label>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-500">Linked behaviors</p>
              {options.map(b => (
                <label key={b.id} className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={behaviorIds.includes(b.id)}
                    onChange={e => setBehaviorIds(ids =>
                      e.target.checked ? [...ids, b.id] : ids.filter(i => i !== b.id))} />
                  {b.name}
                </label>
              ))}
              {options.length === 0 && (
                <p className="text-sm text-slate-500">
                  {code ?? 'This student'} has no behaviors yet. Add one on their Record tab, then link it here.
                </p>
              )}
            </div>
            <div className="text-sm text-slate-500">Target</div>
            <div className="flex items-center gap-2 text-sm">
              <select aria-label="Target direction" value={direction} onChange={e => setDirection(e.target.value as 'at_most' | 'at_least')}
                className="min-h-11 rounded-xl border border-slate-300 bg-white p-2">
                <option value="at_most">At most (≤)</option>
                <option value="at_least">At least (≥)</option>
              </select>
              <input required aria-label="Target amount" type="number" step="any" value={value} onChange={e => setValue(e.target.value)}
                className="w-20 min-h-11 rounded-xl border border-slate-300 p-2 text-center" />
              <select aria-label="Target measure" value={metric} onChange={e => setMetric(e.target.value as NonNullable<Goal['criterion_metric']>)}
                className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white p-2">
                <option value="count_per_day">times per day</option>
                <option value="minutes_per_day">minutes per day</option>
                <option value="avg_rating">average intensity (1–5)</option>
              </select>
            </div>
          </>
        )}
        <label className="block text-sm text-slate-500">Baseline <span className="text-slate-400">(optional)</span>
          <input value={baseline} onChange={e => setBaseline(e.target.value)} placeholder="e.g. 6×/day in May 2026"
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
        </label>
        <label className="block text-sm text-slate-500">
          Target date <span className="text-slate-400">(optional)</span>
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
            className="mt-1 block w-full min-h-11 rounded-xl border border-slate-300 p-3" />
        </label>
        {goal && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            Active <span className="text-slate-400">(untick to retire and keep the data)</span>
          </label>
        )}
        <div className="flex gap-2">
          <button type="submit" className="min-h-11 flex-1 rounded-xl bg-indigo-600 p-3 font-semibold text-white">Save</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4">Cancel</button>
        </div>
        {goal && (
          <DeleteRow label="Delete goal…"
            onDelete={() => {
              if (window.confirm("Delete this goal and its trial data? This can't be undone.")) {
                void removeRow('goals', goal.id).then(onClose);
              }
            }} />
        )}
      </form>
    </div>
  );
}
