import { useState } from 'react';
import { Link } from 'react-router-dom';
import GoalForm from '../components/GoalForm';
import PageHeader from '../components/PageHeader';
import { useData } from '../lib/store';
import { useStudentQuery } from '../components/useStudentQuery';
import type { Goal } from '../lib/types';

const METRIC: Record<NonNullable<Goal['criterion_metric']>, string> = {
  count_per_day: 'times per day', minutes_per_day: 'minutes per day', avg_rating: 'average intensity',
};

export default function ManageGoals() {
  const { students, goals } = useData();
  const active = students.filter(s => s.active).sort((a, b) => a.code.localeCompare(b.code));
  const { studentId, setStudentId } = useStudentQuery(active.map(s => s.id));
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const student = active.find(s => s.id === studentId);
  const mine = goals.filter(g => g.student_id === studentId)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="space-y-4">
      <PageHeader back={{ to: '/manage', label: 'Manage' }} title="Goals"
        action={
          <button onClick={() => setEditing('new')} disabled={!studentId}
            className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white disabled:opacity-40">Add</button>
        } />
      {active.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-center text-slate-500 shadow-sm">
          Goals belong to a student.{' '}
          <Link to="/manage/students" className="font-semibold text-indigo-600">Add a student first</Link>
        </p>
      ) : (
        <label className="block text-sm text-slate-500">Student
          <select value={studentId} onChange={e => setStudentId(e.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 bg-white p-3 text-slate-900">
            {active.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
          </select>
        </label>
      )}
      {student && mine.length === 0 && (
        <p className="py-4 text-center text-slate-500">No goals for {student.code} yet. Tap Add to write one.</p>
      )}
      <ul className="space-y-2">
        {mine.map(g => (
          <li key={g.id}>
            <button onClick={() => setEditing(g)}
              className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {g.title} {!g.active && <span className="text-xs font-normal text-slate-400">(inactive)</span>}
                </span>
                <span className="block text-sm text-slate-500">
                  {g.mode === 'direct'
                    ? `Trials · target ≥ ${g.criterion_percent ?? '?'}%`
                    : `Linked · ${g.criterion_direction === 'at_least' ? '≥' : '≤'} ${g.criterion_value ?? '?'} ${g.criterion_metric ? METRIC[g.criterion_metric] : ''}`}
                </span>
              </span>
              <span aria-hidden="true" className="text-slate-300">›</span>
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
