import { uuid } from '../../lib/id';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { backState, manageLogHref, studentHref } from '../../lib/links';
import { selectEvents } from '../../lib/eventLog';
import EventForm from '../../components/EventForm';
import EventList from '../../components/EventList';
import { StudentBehaviorsSheet } from '../../components/BehaviorSheets';
import Sheet from '../../components/Sheet';
import { btnPrimary, btnSecondary, chip, field } from '../../components/styles';
import { useSheet } from '../../components/useSheet';
import { buzz } from '../../lib/haptics';
import { useData } from '../../lib/store';
import { elapsedSeconds, getTimer, restoreTimer, startTimer, stopTimer } from '../../lib/timers';
import { captureAfterTrigger, needsCaptureSheet, primaryTrigger } from '../../lib/recording';
import type { AbcPreset, Behavior, BehaviorEvent, Student } from '../../lib/types';

interface CaptureDraft { behavior: Behavior; duration_seconds: number | null; rating: number | null }
interface CaptureFields {
  antecedent: string | null; consequence: string | null; rating: number | null; note: string | null;
}

function fmtSecs(secs: number): string {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Today's count for a behavior; it pops when it goes up, confirming the tap registered. */
function TodayCount({ n }: { n: number }) {
  const last = useRef(n);
  const [bumps, setBumps] = useState(0);
  useEffect(() => {
    if (n > last.current) setBumps(b => b + 1);
    last.current = n;
  }, [n]);
  return <span key={bumps} className={bumps > 0 ? 'count-pop font-semibold' : undefined}>{n}</span>;
}

export default function RecordTab({ student }: { student: Student }) {
  const { behaviors, events, activeSession, userId, save, removeRow } = useData();
  const mine = behaviors
    .filter(b => b.student_id === student.id && b.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [lastEvent, setLastEvent] = useState<BehaviorEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<BehaviorEvent | null>(null);
  const [managing, setManaging] = useState(false);
  const [, setTick] = useState(0);

  // 1s tick keeps running-timer labels current.
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Auto-dismiss the undo toast.
  useEffect(() => {
    if (!lastEvent) return;
    const t = setTimeout(() => setLastEvent(null), 6000);
    return () => clearTimeout(t);
  }, [lastEvent]);

  function makeEvent(behavior: Behavior, extra: Partial<BehaviorEvent>): BehaviorEvent {
    const now = new Date().toISOString();
    return {
      id: uuid(), student_id: student.id, behavior_id: behavior.id,
      session_id: activeSession?.id ?? null, occurred_at: now, count: 1,
      duration_seconds: null, rating: null, antecedent: null, consequence: null,
      // The person using this browser is the recorder ('recorded by' on every entry).
      setting: activeSession?.setting ?? null, note: null, recorder: null, user_id: userId,
      created_at: now, ...extra,
    };
  }

  /**
   * One incident = one event. Any attributes the trigger didn't supply are collected in a
   * single capture sheet and saved onto the SAME event, so a multi-dimension behavior never
   * fragments into several events (which used to multiply its frequency count).
   */
  async function log(behavior: Behavior, extra: Partial<BehaviorEvent> = {}, captured = false) {
    if (!captured && needsCaptureSheet(behavior)) {
      setDraft({
        behavior,
        duration_seconds: extra.duration_seconds ?? null,
        rating: extra.rating ?? null,
      });
      return;
    }
    const ev = makeEvent(behavior, extra);
    buzz();
    await save('events', ev);
    setLastEvent(ev);
  }

  function todayCount(behaviorId: string): number {
    const today = new Date().toDateString();
    return events
      .filter(e => e.behavior_id === behaviorId && new Date(e.occurred_at).toDateString() === today)
      .reduce((sum, e) => sum + e.count, 0);
  }

  if (mine.length === 0) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-slate-500">
          Nothing to record for {student.code} yet. Choose the behaviors you want to track.
        </p>
        <button onClick={() => setManaging(true)}
          className="min-h-12 rounded-xl bg-indigo-600 px-5 font-semibold text-white">
          Add behaviors for {student.code}
        </button>
        {managing && <StudentBehaviorsSheet student={student} onClose={() => setManaging(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mine.map(b => {
        const timer = getTimer(b.id);
        const trigger = primaryTrigger(b);
        return (
          <div key={b.id} className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {b.name}
                  {b.category === 'skill' && <span className="ml-1 text-xs text-emerald-600">skill</span>}
                </div>
                <div className="text-xs text-slate-400">
                  <TodayCount n={todayCount(b.id)} /> today
                  {b.track_duration && ' · timed'}
                  {b.track_rating && ' · intensity'}
                  {b.requires_abc && ' · ABC'}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {trigger === 'count' && (
                  <button onClick={() => void log(b)}
                    className="h-14 w-14 rounded-2xl bg-indigo-600 text-xl font-bold text-white transition active:scale-90">
                    +1
                  </button>
                )}
                {trigger === 'timer' && (timer ? (
                  <button onClick={() => {
                      const secs = stopTimer(b.id);
                      if (secs != null) void log(b, { duration_seconds: secs });
                    }}
                    className="timer-running h-14 rounded-2xl bg-rose-600 px-4 font-bold tabular-nums text-white transition active:scale-90">
                    ■ {fmtSecs(elapsedSeconds(timer))}
                  </button>
                ) : (
                  <button aria-label={`Start timing ${b.name}`}
                    onClick={() => { buzz(); startTimer(b.id, student.id); setTick(t => t + 1); }}
                    className="h-14 rounded-2xl bg-emerald-600 px-4 text-xl font-bold text-white transition active:scale-90">
                    ▶
                  </button>
                ))}
              </div>
            </div>
            {trigger === 'rating' && (
              <div>
                <div className="mb-1 text-xs text-slate-400">Tap intensity to log:</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => void log(b, { rating: r })}
                      className="h-12 w-12 rounded-full border border-slate-300 text-base font-semibold text-slate-600 transition active:scale-90 active:bg-indigo-50">
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Opens in place: adding or changing a behavior never leaves the student's page. */}
      <button onClick={() => setManaging(true)}
        className="flex min-h-11 w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500">
        + Add or edit behaviors for {student.code}
      </button>
      {managing && <StudentBehaviorsSheet student={student} onClose={() => setManaging(false)} />}

      {/* Fix an errant entry right where it was recorded: tap it -> Delete (or edit). */}
      {(() => {
        const recent = selectEvents(events, { studentId: student.id, limit: 8 });
        if (recent.length === 0) return null;
        return (
          <section className="space-y-2 pt-2">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">Recent entries</h3>
              <Link to={manageLogHref(student.id)} state={backState(studentHref(student.id), student.code)}
                className="text-sm font-semibold text-indigo-600">
                Full log for {student.code} →
              </Link>
            </div>
            <p className="text-xs text-slate-400">Tap an entry to edit or delete it.</p>
            <EventList events={recent} onSelect={setEditingEvent} hideStudent />
          </section>
        );
      })()}
      {editingEvent && <EventForm event={editingEvent} onClose={() => setEditingEvent(null)} />}

      {draft && (
        <CaptureSheet draft={draft} onCancel={() => {
            if (draft.duration_seconds != null) {
              restoreTimer(draft.behavior.id, student.id, draft.duration_seconds);
            }
            setDraft(null);
          }}
          onSave={f => {
            void log(draft.behavior, { ...f, duration_seconds: draft.duration_seconds }, true);
            setDraft(null);
          }} />
      )}

      {lastEvent && (
        <div key={lastEvent.id} role="status"
          className="toast-in fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg">
          <span className="text-sm">
            Logged {behaviors.find(b => b.id === lastEvent.behavior_id)?.name ?? 'event'}
            {lastEvent.duration_seconds != null && ` (${fmtSecs(lastEvent.duration_seconds)})`}
            {lastEvent.rating != null && ` · intensity ${lastEvent.rating}`}
          </span>
          <button onClick={() => { void removeRow('events', lastEvent.id); setLastEvent(null); }}
            className="min-h-9 rounded-lg px-3 text-sm font-bold text-amber-300">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

function CaptureSheet({ draft, onCancel, onSave }:
  { draft: CaptureDraft; onCancel: () => void; onSave: (f: CaptureFields) => void }) {
  const { abc_presets } = useData();
  // Set by Save; when the sheet has finished closing, this decides which callback runs.
  const result = useRef<CaptureFields | null>(null);
  const { close, bind } = useSheet(() => (result.current ? onSave(result.current) : onCancel()));
  const fields = captureAfterTrigger(draft.behavior);
  const [antecedent, setAntecedent] = useState<string | null>(null);
  const [consequence, setConsequence] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(draft.rating);
  const [note, setNote] = useState('');

  // ABC is the only hard requirement; everything else can be saved as-is.
  const canSave = !fields.abc || (!!antecedent && !!consequence);
  // When intensity is the only thing left to collect, tapping it logs immediately.
  const quickSaveOnRating = fields.rating && !fields.abc;

  function finish(withRating: number | null) {
    result.current = { antecedent, consequence, rating: withRating, note: note.trim() || null };
    close();
  }

  const chips = (kind: AbcPreset['kind'], value: string | null, set: (v: string | null) => void) => (
    <div className="flex flex-wrap gap-2">
      {abc_presets.filter(p => p.kind === kind && p.active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(p => (
          <button key={p.id} type="button" aria-pressed={value === p.label}
            onClick={() => set(value === p.label ? null : p.label)}
            className={chip(value === p.label)}>
            {p.label}
          </button>
        ))}
    </div>
  );

  return (
    <Sheet {...bind} title={draft.behavior.name}
      footer={
        <>
          {fields.abc && !canSave && (
            <p className="text-xs text-slate-500">Pick what happened before and after to save.</p>
          )}
          <div className="flex gap-2">
            <button disabled={!canSave} onClick={() => finish(rating)} className={`${btnPrimary} flex-1`}>Save</button>
            <button onClick={close} className={btnSecondary}>Cancel</button>
          </div>
        </>
      }>
      {draft.duration_seconds != null && (
        <p className="text-sm text-slate-500">
          Duration <span className="font-semibold tabular-nums">{fmtSecs(draft.duration_seconds)}</span> — recorded on this entry.
        </p>
      )}
      {fields.rating && (
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Intensity{quickSaveOnRating && <span className="font-normal text-slate-400"> (tap to save)</span>}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map(r => (
              <button key={r} type="button" aria-pressed={rating === r}
                onClick={() => (quickSaveOnRating ? finish(r) : setRating(rating === r ? null : r))}
                className={`h-12 w-12 rounded-full border text-base font-semibold transition active:scale-90 ${
                  rating === r ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
      {fields.abc && (
        <>
          <p className="text-sm font-semibold text-slate-500">What happened right before? (Antecedent)</p>
          {chips('antecedent', antecedent, setAntecedent)}
          <p className="text-sm font-semibold text-slate-500">What happened right after? (Consequence)</p>
          {chips('consequence', consequence, setConsequence)}
        </>
      )}
      <label className="block text-sm text-slate-500">Note <span className="text-slate-400">(optional)</span>
        <input value={note} onChange={e => setNote(e.target.value)} className={field} />
      </label>
    </Sheet>
  );
}
