import { uuid } from '../lib/id';
import { useEffect, useId, useState, type FormEvent } from 'react';
import Sheet from './Sheet';
import { btnPrimary, btnSecondary, chip, field } from './styles';
import { useSheet } from './useSheet';
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
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button onClick={() => setStarting(true)}
              className="min-h-9 shrink-0 text-sm font-semibold text-indigo-700">▶ Start session</button>
            <span className="truncate text-xs text-indigo-500">Optional: tags entries with the activity</span>
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
  const { close, bind } = useSheet(onClose);
  const formId = useId();
  const [activity, setActivity] = useState('');
  const [setting, setSetting] = useState<string | null>(null);
  // Most recent first: the activity about to start is usually one from the last few days.
  const pastActivities = [...new Set(
    [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at)).map(s => s.activity),
  )].slice(0, 8);
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
    close();
  }

  return (
    <Sheet {...bind} title="Start session"
      footer={
        <div className="flex gap-2">
          <button type="submit" form={formId} className={`${btnPrimary} flex-1`}>Start</button>
          <button type="button" onClick={close} className={btnSecondary}>Cancel</button>
        </div>
      }>
      <form id={formId} onSubmit={e => void submit(e)} className="space-y-3">
        <p className="text-sm text-slate-500">
          While a session runs, everything you record is tagged with its activity, so the charts can
          compare, say, Math with Recess. You can record without one.
        </p>
        <label className="block text-sm text-slate-500">Activity
          <input required autoFocus value={activity} onChange={e => setActivity(e.target.value)}
            placeholder="e.g. Math, Recess" className={field} />
        </label>
        {pastActivities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pastActivities.map(a => (
              <button key={a} type="button" onClick={() => setActivity(a)} aria-pressed={activity === a}
                className={chip(activity === a)}>
                {a}
              </button>
            ))}
          </div>
        )}
        {settings.length > 0 && <div className="text-sm text-slate-500">Where <span className="text-slate-400">(optional)</span></div>}
        <div className="flex flex-wrap gap-2">
          {settings.map(p => (
            <button key={p.id} type="button" aria-pressed={setting === p.label}
              onClick={() => setSetting(setting === p.label ? null : p.label)}
              className={chip(setting === p.label)}>
              {p.label}
            </button>
          ))}
        </div>
      </form>
    </Sheet>
  );
}

function SessionSummary({ session, onClose }: { session: Session; onClose: () => void }) {
  const { students, behaviors, events, goal_entries, goals } = useData();
  const { close, bind } = useSheet(onClose);
  const sessionEvents = events.filter(e => e.session_id === session.id);
  const sessionTrials = goal_entries.filter(g => g.session_id === session.id);
  const studentIds = [...new Set([
    ...sessionEvents.map(e => e.student_id),
    ...sessionTrials.map(t => goals.find(g => g.id === t.goal_id)?.student_id ?? ''),
  ])].filter(Boolean);

  return (
    <Sheet {...bind} title={`Session summary — ${session.activity}`}
      footer={<button onClick={close} className={`${btnPrimary} w-full`}>Done</button>}>
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
    </Sheet>
  );
}
