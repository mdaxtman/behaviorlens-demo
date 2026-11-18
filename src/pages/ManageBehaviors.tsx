import { uuid } from '../lib/id';
import { useState, type FormEvent } from 'react';
import { useData } from '../lib/store';
import { useStudentQuery } from '../components/useStudentQuery';
import type { Behavior } from '../lib/types';

export default function ManageBehaviors() {
  const { students, behaviors } = useData();
  const active = students.filter(s => s.active).sort((a, b) => a.code.localeCompare(b.code));
  const { studentId, setStudentId, startWithNew } = useStudentQuery(active.map(s => s.id));
  const [editing, setEditing] = useState<Behavior | 'new' | null>(startWithNew ? 'new' : null);
  const mine = behaviors
    .filter(b => b.student_id === studentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Behaviors</h2>
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
        {mine.map(b => (
          <li key={b.id}>
            <button onClick={() => setEditing(b)}
              className="w-full rounded-xl bg-white p-3 text-left shadow-sm">
              <div className="font-semibold">
                {b.name} {!b.active && <span className="text-xs text-slate-400">(inactive)</span>}
              </div>
              <div className="text-sm text-slate-500">
                {b.category === 'challenging' ? 'Challenging' : 'Skill'}
                {b.track_frequency && ' · count'}{b.track_duration && ' · duration'}
                {b.track_rating && ' · rating'}{b.requires_abc && ' · ABC required'}
              </div>
            </button>
          </li>
        ))}
      </ul>
      {editing && studentId && (
        <BehaviorForm behavior={editing === 'new' ? null : editing} studentId={studentId}
          onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function BehaviorForm({ behavior, studentId, onClose }:
  { behavior: Behavior | null; studentId: string; onClose: () => void }) {
  const { save, removeRow } = useData();
  const [name, setName] = useState(behavior?.name ?? '');
  const [description, setDescription] = useState(behavior?.description ?? '');
  const [category, setCategory] = useState<Behavior['category']>(behavior?.category ?? 'challenging');
  const [freq, setFreq] = useState(behavior?.track_frequency ?? true);
  const [dur, setDur] = useState(behavior?.track_duration ?? false);
  const [rating, setRating] = useState(behavior?.track_rating ?? false);
  // Spec: ABC is required by default on NEW behaviors until the team understands the function.
  const [abc, setAbc] = useState(behavior?.requires_abc ?? true);
  const [active, setActive] = useState(behavior?.active ?? true);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const row: Behavior = {
      id: behavior?.id ?? uuid(),
      student_id: studentId,
      name: name.trim(),
      description: description.trim() || null,
      category,
      track_frequency: freq, track_duration: dur, track_rating: rating,
      requires_abc: abc, active,
      created_at: behavior?.created_at ?? new Date().toISOString(),
    };
    await save('behaviors', row);
    onClose();
  }

  const Toggle = ({ label, value, set }:
    { label: string; value: boolean; set: (v: boolean) => void }) => (
    <label className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-3 text-sm">
      {label}
      <input type="checkbox" checked={value} onChange={e => set(e.target.checked)} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h3 className="text-lg font-bold">{behavior ? 'Edit behavior' : 'New behavior'}</h3>
        <label className="block text-sm text-slate-500">Behavior name
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aggression"
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
        </label>
        <label className="block text-sm text-slate-500">Operational definition <span className="text-slate-400">(optional)</span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-slate-900" />
          <span className="mt-1 block text-xs text-slate-400">What counts as this behavior, so everyone records it the same way.</span>
        </label>
        <div className="flex gap-2">
          {(['challenging', 'skill'] as const).map(c => (
            <button key={c} type="button" onClick={() => setCategory(c)}
              className={`min-h-11 flex-1 rounded-xl border p-2 text-sm font-medium ${
                category === c ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}>
              {c === 'challenging' ? 'Challenging' : 'Skill / replacement'}
            </button>
          ))}
        </div>
        <Toggle label="Track frequency (tap = +1)" value={freq} set={setFreq} />
        <Toggle label="Track duration (timer)" value={dur} set={setDur} />
        <Toggle label="Track intensity rating (1–5)" value={rating} set={setRating} />
        <Toggle label="Require ABC on each recording" value={abc} set={setAbc} />
        <p className="text-xs text-slate-400">
          Every recording counts as one occurrence. If duration or intensity is tracked, that
          control logs the whole incident (timer stop, or intensity tap) and the +1 button is
          hidden as redundant — so one incident is never counted twice.
        </p>
        <Toggle label="Active" value={active} set={setActive} />
        <div className="flex gap-2">
          <button type="submit" className="min-h-11 flex-1 rounded-xl bg-indigo-600 p-3 font-semibold text-white">Save</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4">Cancel</button>
          {behavior && (
            <button type="button"
              onClick={() => {
                if (window.confirm('Delete this behavior and its recordings?')) {
                  void removeRow('behaviors', behavior.id).then(onClose);
                }
              }}
              className="min-h-11 rounded-xl border border-red-200 px-4 text-red-600">Delete</button>
          )}
        </div>
      </form>
    </div>
  );
}