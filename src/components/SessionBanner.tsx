import { uuid } from '../lib/id';
import { useEffect, useState, type FormEvent } from 'react';
import { useData } from '../lib/store';
import type { Session } from '../lib/types';

function fmtElapsed(startedAt: string): string {
  const secs = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(secs / 60), s = secs % 60;
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s).padStart(2, '0')}`;
}

export default function SessionBanner() {
  const { activeSession, save } = useData();
  const [starting, setStarting] = useState(false);
  const [summaryOf, setSummaryOf] = useState<Session | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  async function endSession() {
    if (!activeSession) return;
    const ended = { ...activeSession, ended_at: new Date().toISOString() };
    await save('sessions', ended);
    setSummaryOf(ended);
  }

  return (
    <>
      <div className="border-b border-slate-200 bg-indigo-50 px-4 py-2">
        {activeSession ? (
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold text-indigo-800">{activeSession.activity}</span>
              {activeSession.setting && <span className="text-indigo-600"> · {activeSession.setting}</span>}
              <span className="ml-2 tabular-nums text-indigo-500">{fmtElapsed(activeSession.started_at)}</span>
            </div>
            <button onClick={() => void endSession()}
              className="min-h-9 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white">End</button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <button onClick={() => setStarting(true)}
              className="min-h-9 text-sm font-semibold text-indigo-700">▶ Start session</button>
          </div>
        )}
      </div>
      {starting && <StartForm onClose={() => setStarting(false)} />}
      {summaryOf && <SessionSummary session={summaryOf} onClose={() => setSummaryOf(null)} />}
    </>
  );
}

function StartForm({ onClose }: { onClose: () => void }) {
  const { sessions, abc_presets, save } = useData();
  const [activity, setActivity] = useState('');
  const [setting, setSetting] = useState<string | null>(null);
  const pastActivities = [...new Set(sessions.map(s => s.activity))].sort();
  const settings = abc_presets.filter(p => p.kind === 'setting' && p.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!activity.trim()) return;
    const now = new Date().toISOString();
    await save('sessions', {
      id: uuid(), activity: activity.trim(), setting,
      started_at: now, ended_at: null, note: null, created_at: now,
    } as Session);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h3 className="text-lg font-bold">Start session</h3>
        <label className="block text-sm text-slate-500">Activity
          <input required autoFocus value={activity} onChange={e => setActivity(e.target.value)}
            placeholder="e.g. Math, Recess" list="past-activities"
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
        </label>
        <datalist id="past-activities">
          {pastActivities.map(a => <option key={a} value={a} />)}
        </datalist>
        <div className="flex flex-wrap gap-2">
          {settings.map(p => (
            <button key={p.id} type="button"
              onClick={() => setSetting(setting === p.label ? null : p.label)}
              className={`min-h-11 rounded-full border px-4 text-sm ${
                setting === p.label ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="submit" className="min-h-11 flex-1 rounded-xl bg-indigo-600 p-3 font-semibold text-white">Start</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function SessionSummary({ session, onClose }: { session: Session; onClose: () => void }) {
  const { students, behaviors, events, goal_entries, goals } = useData();
  const sessionEvents = events.filter(e => e.session_id === session.id);
  const sessionTrials = goal_entries.filter(g => g.session_id === session.id);
  const studentIds = [...new Set([
    ...sessionEvents.map(e => e.student_id),
    ...sessionTrials.map(t => goals.find(g => g.id === t.goal_id)?.student_id ?? ''),
  ])].filter(Boolean);

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h3 className="text-lg font-bold">Session summary — {session.activity}</h3>
        {studentIds.length === 0 && <p className="text-slate-500">No data recorded this session.</p>}
        {studentIds.map(sid => {
          const student = students.find(s => s.id === sid);
          const evts = sessionEvents.filter(e => e.student_id === sid);
          const byBehavior = new Map<string, { count: number; seconds: number }>();
          for (const e of evts) {
            const name = behaviors.find(b => b.id === e.behavior_id)?.name ?? 'Unknown';
            const agg = byBehavior.get(name) ?? { count: 0, seconds: 0 };
            agg.count += e.count;
            agg.seconds += e.duration_seconds ?? 0;
            byBehavior.set(name, agg);
          }
          const trials = sessionTrials.filter(t =>
            goals.find(g => g.id === t.goal_id)?.student_id === sid);
          return (
            <div key={sid} className="rounded-xl border border-slate-200 p-3">
              <div className="font-semibold">{student?.code ?? '??'}</div>
              <ul className="text-sm text-slate-600">
                {[...byBehavior.entries()].map(([name, agg]) => (
                  <li key={name}>
                    {name}: {agg.count}×{agg.seconds > 0 && ` · ${Math.round(agg.seconds / 60)} min`}
                  </li>
                ))}
                {trials.map(t => {
                  const goal = goals.find(g => g.id === t.goal_id);
                  return <li key={t.id}>{goal?.title ?? 'Goal'}: {t.successes}/{t.opportunities}</li>;
                })}
              </ul>
            </div>
          );
        })}
        <button onClick={onClose}
          className="w-full min-h-11 rounded-xl bg-indigo-600 p-3 font-semibold text-white">Done</button>
      </div>
    </div>
  );
}