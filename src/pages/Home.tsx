import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { AddStudents } from '../components/StudentForm';
import { dayKey } from '../lib/analytics';
import { useData } from '../lib/store';
import { getTimers } from '../lib/timers';

export default function Home() {
  const { students, events, ready } = useData();
  const [adding, setAdding] = useState(false);
  const active = students.filter(s => s.active).sort((a, b) => a.code.localeCompare(b.code));

  /** Occurrences recorded today, per student. */
  const today = useMemo(() => {
    const key = dayKey(new Date().toISOString());
    const counts = new Map<string, number>();
    for (const e of events) {
      if (dayKey(e.occurred_at) === key) counts.set(e.student_id, (counts.get(e.student_id) ?? 0) + e.count);
    }
    return counts;
  }, [events]);
  // A timer left running on another student is otherwise invisible from here.
  const timing = new Set(getTimers().map(t => t.studentId));

  if (!ready) return null;

  if (active.length === 0) {
    return (
      <>
        <div className="mx-auto mt-8 max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold">Set up your class</h2>
          <p className="text-slate-500">
            Start with the students you collect data for. Each one gets a short code instead of a
            name. After that you pick the behaviors and goals to track for them.
          </p>
          <button onClick={() => setAdding(true)}
            className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 font-semibold text-white">
            Add your first student
          </button>
          <p className="text-sm text-slate-500">
            Or{' '}
            <Link to="/manage#demo" className="font-semibold text-indigo-600">bring back the sample classroom</Link>
          </p>
          {students.length > 0 && (
            <p className="text-sm text-slate-500">
              All {students.length} of your students are marked inactive.{' '}
              <Link to="/manage/students" className="font-semibold text-indigo-600">Manage students</Link>
            </p>
          )}
        </div>
        {adding && <AddStudents onClose={() => setAdding(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {active.map(s => {
          const n = today.get(s.id) ?? 0;
          return (
            <Link key={s.id} to={`/student/${s.id}`}
              className="relative flex flex-col items-center gap-1 rounded-2xl bg-white p-4 shadow-sm transition active:scale-95">
              {timing.has(s.id) && (
                <span className="absolute right-2 top-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  ● timing
                </span>
              )}
              <Avatar student={s} size={72} />
              <span className="mt-1 font-bold">{s.code}</span>
              <span className={`text-xs ${n > 0 ? 'font-medium text-slate-600' : 'text-slate-400'}`}>
                {n > 0 ? `${n} today` : 'Nothing today'}
              </span>
            </Link>
          );
        })}
        <button onClick={() => setAdding(true)}
          className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 transition active:scale-95">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-2xl text-slate-500">+</span>
          Add student
        </button>
      </div>
      {adding && <AddStudents onClose={() => setAdding(false)} />}
    </>
  );
}
