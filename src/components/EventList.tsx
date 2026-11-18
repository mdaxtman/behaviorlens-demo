import { dayKey } from '../lib/analytics';
import { useData } from '../lib/store';
import type { BehaviorEvent } from '../lib/types';

/**
 * Recorded events grouped under day headings, newest first (pass them pre-sorted, e.g. via
 * selectEvents). Each row shows student, behavior, details and who recorded it; tapping a row
 * calls onSelect. Shared by the Data log and a student's Record tab.
 */
export default function EventList({ events, onSelect, hideStudent = false }:
  { events: BehaviorEvent[]; onSelect: (e: BehaviorEvent) => void; hideStudent?: boolean }) {
  const { students, behaviors, profiles } = useData();
  // Recorder identity: user_id -> profile (initials, else name); legacy free-text fallback.
  const recorderLabel = (e: BehaviorEvent): string | null => {
    const p = e.user_id ? profiles.find(x => x.id === e.user_id) : undefined;
    return p ? (p.initials || p.display_name || null) : (e.recorder ?? null);
  };
  let lastDay = '';
  return (
    <ul className="space-y-1">
      {events.map(e => {
        const day = dayKey(e.occurred_at);
        const header = day !== lastDay ? (lastDay = day) : null;
        const student = students.find(s => s.id === e.student_id);
        const behavior = behaviors.find(b => b.id === e.behavior_id);
        return (
          <li key={e.id}>
            {header && <div className="pt-2 text-xs font-semibold text-slate-400">{header}</div>}
            <button onClick={() => onSelect(e)}
              className="flex w-full items-center justify-between rounded-xl bg-white p-3 text-left text-sm shadow-sm">
              <span>
                {!hideStudent && <><span className="font-semibold">{student?.code ?? '??'}</span> · </>}
                    <span className={hideStudent ? 'font-semibold' : ''}>{behavior?.name ?? '?'}</span>
                {e.duration_seconds != null && ` · ${Math.round(e.duration_seconds / 60)}m`}
                {e.rating != null && ` · ${e.rating}/5`}
                {e.antecedent && ` · ${e.antecedent} → ${e.consequence ?? '?'}`}
                {recorderLabel(e) && ` · by ${recorderLabel(e)}`}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(e.occurred_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
