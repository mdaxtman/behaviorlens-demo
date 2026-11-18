import { uuid } from '../lib/id';
import { useState, type FormEvent } from 'react';
import { useData } from '../lib/store';
import { useStudentQuery } from '../components/useStudentQuery';
import type { Goal } from '../lib/types';

export default function ManageGoals() {
  const { students, goals } = useData();
  const active = students.filter(s => s.active).sort((a, b) => a.code.localeCompare(b.code));
  const { studentId, setStudentId, startWithNew } = useStudentQuery(active.map(s => s.id));
  const [editing, setEditing] = useState<Goal | 'new' | null>(startWithNew ? 'new' : null);
  const mine = goals.filter(g => g.student_id === studentId)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Goals</h2>
        <button onClick={() => setEditing('new')} disabled={!studentId}
          className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white disabled:opacity-40">Add</button>
      </div>
      <label className="block text-sm text-slate-500">Student
        <select value={studentId} onChange={e => setStudentId(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 bg-white p-3 text-slate-900">
          {active.length === 0 && <option value="">No students — add one first</option>}
          {active.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
        </select>
      </label>
      <ul className="space-y-2">
        {mine.map(g => (
          <li key={g.id}>
            <button onClick={() => setEditing(g)}
              className="w-full rounded-xl bg-white p-3 text-left shadow-sm">
              <div className="font-semibold">
                {g.title} {!g.active && <span className="text-xs text-slate-400">(inactive)</span>}
              </div>
              <div className="text-sm text-slate-500">
                {g.mode === 'direct'
                  ? `Trials · target ≥ ${g.criterion_percent ?? '?'}%`
                  : `Linked · ${g.criterion_direction === 'at_least' ? '≥' : '≤'} ${g.criterion_value ?? '?'} ${g.criterion_metric ?? ''}`}
              </div>
            </button>
          </li>
        ))}
      </ul>
      {editing && studentId && (
        <GoalForm goal={editing === 'new' ? null : editing} studentId={studentId}
          onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function GoalForm({ goal, studentId, onClose }:
  { goal: Goal | null; studentId: string; onClose: () => void }) {
  const { behaviors, save, removeRow } = useData();
  const options = behaviors.filter(b => b.student_id === studentId && b.active);
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
      <form onSubmit={submit} onClick={e => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h3 className="text-lg font-bold">{goal ? 'Edit goal' : 'New goal'}</h3>
        <label className="block text-sm text-slate-500">Goal title
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fewer aggressions"
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
        </label>
        <label className="block text-sm text-slate-500">IEP goal text <span className="text-slate-400">(optional)</span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-slate-900" />
          <span className="mt-1 block text-xs text-slate-400">Included in generated prompts — avoid real names.</span>
        </label>
        <div className="flex gap-2">
          {(['direct', 'linked'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`min-h-11 flex-1 rounded-xl border p-2 text-sm font-medium ${
                mode === m ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}>
              {m === 'direct' ? 'Trial entry (✓/✗)' : 'Linked to behavior data'}
            </button>
          ))}
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
              {options.length === 0 && <p className="text-sm text-slate-400">No behaviors defined yet.</p>}
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
          Target date
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
            className="mt-1 block w-full min-h-11 rounded-xl border border-slate-300 p-3" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Active
        </label>
        <div className="flex gap-2">
          <button type="submit" className="min-h-11 flex-1 rounded-xl bg-indigo-600 p-3 font-semibold text-white">Save</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4">Cancel</button>
          {goal && (
            <button type="button"
              onClick={() => {
                if (window.confirm('Delete this goal and its trial data?')) {
                  void removeRow('goals', goal.id).then(onClose);
                }
              }}
              className="min-h-11 rounded-xl border border-red-200 px-4 text-red-600">Delete</button>
          )}
        </div>
      </form>
    </div>
  );
}