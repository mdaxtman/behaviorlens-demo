import { uuid } from '../../lib/id';
import { useState } from 'react';
import GoalForm from '../../components/GoalForm';
import { goalCurrent, lastNDays, dayKey } from '../../lib/analytics';
import { getDeviceId } from '../../lib/prefs';
import { useData } from '../../lib/store';
import type { Goal, GoalEntry, Student } from '../../lib/types';

export default function GoalsTab({ student }: { student: Student }) {
  const { goals, goal_entries, events, activeSession, save } = useData();
  const mine = goals.filter(g => g.student_id === student.id && g.active)
    .sort((a, b) => a.title.localeCompare(b.title));
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const range = lastNDays(7);
  const today = dayKey(new Date().toISOString());

  // ✓/✗ taps aggregate into a single goal_entries row per goal per day PER DEVICE — keying
  // on device_id too (not just goal_id + day) means two devices editing the same goal on the
  // same day each get their own row instead of last-write-wins clobbering the other's taps.
  async function trial(goal: Goal, success: boolean) {
    const deviceId = getDeviceId();
    const existing = goal_entries.find(e => e.goal_id === goal.id
      && dayKey(e.occurred_at) === today && e.device_id === deviceId);
    const now = new Date().toISOString();
    const entry: GoalEntry = existing
      ? { ...existing,
          successes: existing.successes + (success ? 1 : 0),
          opportunities: existing.opportunities + 1 }
      : { id: uuid(), goal_id: goal.id, session_id: activeSession?.id ?? null,
          occurred_at: now, successes: success ? 1 : 0, opportunities: 1, note: null, created_at: now,
          device_id: deviceId };
    await save('goal_entries', entry);
  }

  // Opens in place: adding or changing a goal never leaves the student's page.
  const form = editing && (
    <GoalForm goal={editing === 'new' ? null : editing} studentId={student.id}
      onClose={() => setEditing(null)} />
  );

  if (mine.length === 0) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-slate-500">
          No goals for {student.code} yet. A goal tracks progress toward an IEP target.
        </p>
        <button onClick={() => setEditing('new')}
          className="min-h-12 rounded-xl bg-indigo-600 px-5 font-semibold text-white">
          Add a goal for {student.code}
        </button>
        {form}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mine.map(g => {
        const cur = goalCurrent(g, events.filter(e => e.student_id === student.id),
          goal_entries.filter(e => e.goal_id === g.id), range);
        // Same per-device filter as trial() — the tally shows THIS device's taps for today.
        const todayEntry = goal_entries.find(e => e.goal_id === g.id
          && dayKey(e.occurred_at) === today && e.device_id === getDeviceId());
        return (
          <div key={g.id} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold">{g.title}</div>
                <div className="text-sm text-slate-500">
                  Last 7 days: {cur.label}
                  {cur.met != null && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      cur.met ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {cur.met ? 'On track' : 'Below target'}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setEditing(g)} aria-label={`Edit goal: ${g.title}`}
                className="-mr-1 -mt-2 min-h-11 shrink-0 px-2 text-sm font-semibold text-indigo-600">
                Edit
              </button>
            </div>
            {g.mode === 'direct' && (
              <div className="flex items-center gap-3">
                <button onClick={() => void trial(g, true)}
                  className="h-14 flex-1 rounded-2xl bg-emerald-600 text-2xl font-bold text-white transition active:scale-90">✓</button>
                <button onClick={() => void trial(g, false)}
                  className="h-14 flex-1 rounded-2xl bg-rose-600 text-2xl font-bold text-white transition active:scale-90">✗</button>
                <span className="w-16 text-center font-bold tabular-nums text-slate-600">
                  {todayEntry ? `${todayEntry.successes}/${todayEntry.opportunities}` : '0/0'}
                </span>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={() => setEditing('new')}
        className="flex min-h-11 w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500">
        + Add goal for {student.code}
      </button>
      {form}
    </div>
  );
}