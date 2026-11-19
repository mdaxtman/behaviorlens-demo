import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import Sheet, { DeleteRow } from './Sheet';
import { btnPrimary, btnSecondary, choice, field } from './styles';
import { useSheet } from './useSheet';
import {
  bankKey, buildBank, copyForStudent, DEFAULT_SETTINGS, planSharedSave, planStudentSave,
  settingsOf, settingsSummary, starterSuggestions, studentOptions,
  type BankEntry, type BehaviorSettings,
} from '../lib/behaviorBank';
import { uuid } from '../lib/id';
import { useData } from '../lib/store';
import type { Behavior, Student } from '../lib/types';

const byCode = (a: Student, b: Student) => a.code.localeCompare(b.code);
const clean = (s: BehaviorSettings): BehaviorSettings =>
  ({ ...s, name: s.name.trim(), description: s.description?.trim() || null });

function Toggle({ label, value, set }: { label: string; value: boolean; set: (v: boolean) => void }) {
  return (
    <label className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition ${
      value ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200'}`}>
      {label}
      <input type="checkbox" checked={value} onChange={e => set(e.target.checked)} />
    </label>
  );
}

/** Name, definition and how it is recorded: the part of a behavior that can be shared. */
function SettingsFields({ value, onChange }: { value: BehaviorSettings; onChange: (s: BehaviorSettings) => void }) {
  const set = (patch: Partial<BehaviorSettings>) => onChange({ ...value, ...patch });
  return (
    <>
      <label className="block text-sm text-slate-500">Behavior name
        <input required value={value.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Aggression"
          className={field} />
      </label>
      <label className="block text-sm text-slate-500">Operational definition <span className="text-slate-400">(optional)</span>
        <textarea value={value.description ?? ''} onChange={e => set({ description: e.target.value })} rows={2}
          className={field} />
        <span className="mt-1 block text-xs text-slate-400">What counts as this behavior, so everyone records it the same way.</span>
      </label>
      <div className="flex gap-2">
        {(['challenging', 'skill'] as const).map(c => (
          <button key={c} type="button" onClick={() => set({ category: c })} aria-pressed={value.category === c}
            className={`${choice(value.category === c)} flex-1`}>
            {c === 'challenging' ? 'Challenging' : 'Skill / replacement'}
          </button>
        ))}
      </div>
      <Toggle label="Track frequency (tap = +1)" value={value.track_frequency} set={v => set({ track_frequency: v })} />
      <Toggle label="Track duration (timer)" value={value.track_duration} set={v => set({ track_duration: v })} />
      <Toggle label="Track intensity rating (1–5)" value={value.track_rating} set={v => set({ track_rating: v })} />
      <Toggle label="Require ABC on each recording" value={value.requires_abc} set={v => set({ requires_abc: v })} />
      <p className="text-xs text-slate-400">
        Every recording counts as one occurrence. If duration or intensity is tracked, that
        control logs the whole incident (timer stop, or intensity tap) and the +1 button is
        hidden as redundant — so one incident is never counted twice.
      </p>
    </>
  );
}

/**
 * A behavior for the whole class: its settings plus which students have it. Used to create a
 * behavior (optionally from a starting point, with some students already picked) and to edit
 * one for everyone who has it.
 */
export function SharedBehaviorSheet({ entry, prefill, preselect, onClose }: {
  entry: BankEntry | null;
  prefill?: BehaviorSettings;
  preselect?: string[];
  onClose: () => void;
}) {
  const { students, behaviors, save, removeRow } = useData();
  const { close, bind } = useSheet(onClose);
  const formId = useId();
  const active = students.filter(s => s.active).sort(byCode);
  const [draft, setDraft] = useState<BehaviorSettings>(entry?.settings ?? prefill ?? DEFAULT_SETTINGS);
  const [picked, setPicked] = useState<string[]>(
    entry ? entry.members.filter(m => m.behavior.active).map(m => m.student.id) : preselect ?? []);
  const [overwrite, setOverwrite] = useState(false);

  const memberOf = (studentId: string) => entry?.members.find(m => m.student.id === studentId);
  const clash = buildBank(behaviors, active)
    .find(e => e.key === bankKey(draft.name) && e.key !== entry?.key);
  const customized = active.filter(s => picked.includes(s.id) && memberOf(s.id)?.customized);
  const needsStudent = !entry && picked.length === 0;
  const allPicked = active.length > 0 && active.every(s => picked.includes(s.id));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (clash || needsStudent) return;
    const rows = planSharedSave({
      entry, settings: clean(draft), studentIds: picked, overwriteCustomized: overwrite,
      now: new Date().toISOString(), newId: uuid,
    });
    for (const row of rows) await save('behaviors', row);
    close();
  }

  async function deleteForEveryone() {
    if (!entry) return;
    const n = entry.members.length;
    if (!window.confirm(
      `Delete "${entry.name}" for ${n === 1 ? entry.members[0].student.code : `all ${n} students`}, `
      + "including every recording of it? This can't be undone.\n\n"
      + 'To stop tracking it and keep the data, untick the students instead.')) return;
    for (const m of entry.members) await removeRow('behaviors', m.behavior.id);
    close();
  }

  return (
    <Sheet {...bind} title={entry ? `Edit ${entry.name}` : 'New behavior'}
      footer={
        <div className="flex gap-2">
          <button type="submit" form={formId} disabled={!!clash || needsStudent} className={`${btnPrimary} flex-1`}>
            {entry ? 'Save for these students' : 'Save'}
          </button>
          <button type="button" onClick={close} className={btnSecondary}>Cancel</button>
        </div>
      }>
      <form id={formId} onSubmit={e => void submit(e)} className="space-y-3">
        <SettingsFields value={draft} onChange={setDraft} />
        {clash && (
          <p className="text-sm text-red-600">
            "{clash.name}" is already in your class list. Close this and edit that one instead.
          </p>
        )}

        <fieldset className="space-y-1">
          <div className="flex items-baseline justify-between">
            <legend className="text-sm font-semibold text-slate-600">Students who have it</legend>
            {active.length > 1 && (
              <button type="button" onClick={() => setPicked(allPicked ? [] : active.map(s => s.id))}
                className="min-h-9 text-sm font-semibold text-indigo-600">
                {allPicked ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>
          {active.length === 0 && (
            <p className="text-sm text-slate-500">
              No students yet.{' '}
              <Link to="/manage/students" className="font-semibold text-indigo-600">Add a student first</Link>
            </p>
          )}
          {active.map(s => {
            const m = memberOf(s.id);
            return (
              <label key={s.id} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm transition ${
                picked.includes(s.id) ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200'}`}>
                <input type="checkbox" checked={picked.includes(s.id)}
                  onChange={e => setPicked(p => e.target.checked ? [...p, s.id] : p.filter(i => i !== s.id))} />
                <Avatar student={s} size={28} />
                <span className="font-semibold">{s.code}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {m && !m.behavior.active ? 'retired' : m?.customized ? 'customized' : ''}
                </span>
              </label>
            );
          })}
          {needsStudent && active.length > 0 && (
            <p className="text-xs text-slate-500">Pick at least one student.</p>
          )}
          {entry && (
            <p className="text-xs text-slate-400">
              Unticking a student retires the behavior for them. Their recordings are kept.
            </p>
          )}
        </fieldset>

        {customized.length > 0 && (
          <label className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
            <span>
              Also replace the customized version for {customized.map(s => s.code).join(', ')}.
              Otherwise {customized.length === 1 ? 'it keeps its' : 'they keep their'} own settings.
            </span>
          </label>
        )}

        {entry && <DeleteRow label="Delete for everyone…" onDelete={() => void deleteForEveryone()} />}
      </form>
    </Sheet>
  );
}

/** One student's copy of a behavior, with the option to carry the edit to others who have it. */
export function StudentBehaviorSheet({ behavior, onClose }: { behavior: Behavior; onClose: () => void }) {
  const { students, behaviors, save, removeRow } = useData();
  const { close, bind } = useSheet(onClose);
  const formId = useId();
  const student = students.find(s => s.id === behavior.student_id);
  const [draft, setDraft] = useState<BehaviorSettings>(settingsOf(behavior));
  const [active, setActive] = useState(behavior.active);
  const [also, setAlso] = useState<string[]>([]);

  // Others who have the behavior under the name it had when this sheet opened.
  const others = behaviors
    .filter(b => b.id !== behavior.id && bankKey(b.name) === bankKey(behavior.name))
    .map(b => ({ behavior: b, student: students.find(s => s.id === b.student_id) }))
    .filter((o): o is { behavior: Behavior; student: Student } => !!o.student && o.student.active)
    .sort((a, b) => byCode(a.student, b.student));
  const clash = behaviors.find(b => b.id !== behavior.id && b.student_id === behavior.student_id
    && bankKey(b.name) === bankKey(draft.name));
  const code = student?.code ?? 'this student';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (clash) return;
    const mine: Behavior = { ...behavior, ...clean(draft), active };
    const rows = planStudentSave(mine, others.filter(o => also.includes(o.behavior.id)).map(o => o.behavior));
    for (const row of rows) await save('behaviors', row);
    close();
  }

  return (
    <Sheet {...bind} title={`${behavior.name} for ${code}`}
      footer={
        <div className="flex gap-2">
          <button type="submit" form={formId} disabled={!!clash} className={`${btnPrimary} flex-1`}>Save</button>
          <button type="button" onClick={close} className={btnSecondary}>Cancel</button>
        </div>
      }>
      <form id={formId} onSubmit={e => void submit(e)} className="space-y-3">
        <p className="text-sm text-slate-500">Changes here apply to {code} only, unless you tick others below.</p>
        <SettingsFields value={draft} onChange={setDraft} />
        {clash && <p className="text-sm text-red-600">{code} already has a behavior called "{clash.name}".</p>}
        <Toggle label={`Tracking for ${code} (untick to retire and keep the data)`} value={active} set={setActive} />

        {others.length > 0 && (
          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold text-slate-600">Also update for</legend>
            {others.map(o => (
              <label key={o.behavior.id} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm transition ${
                also.includes(o.behavior.id) ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200'}`}>
                <input type="checkbox" checked={also.includes(o.behavior.id)}
                  onChange={e => setAlso(a => e.target.checked ? [...a, o.behavior.id] : a.filter(i => i !== o.behavior.id))} />
                <Avatar student={o.student} size={28} />
                <span className="font-semibold">{o.student.code}</span>
              </label>
            ))}
          </fieldset>
        )}

        <DeleteRow label={`Delete for ${code}…`}
          onDelete={() => {
            if (window.confirm(`Delete "${behavior.name}" for ${code}, including every recording of it? This can't be undone.`)) {
              void removeRow('behaviors', behavior.id).then(close);
            }
          }} />
      </form>
    </Sheet>
  );
}

/**
 * Everything about one student's behaviors, without leaving their page: edit what they track,
 * add a behavior the class already uses, start from a common one, or create a new one.
 */
export function StudentBehaviorsSheet({ student, onClose }: { student: Student; onClose: () => void }) {
  const { students, behaviors, save } = useData();
  const { close, bind } = useSheet(onClose);
  // A sheet opened from this one sits on top of it, so closing it returns here.
  const [view, setView] = useState<'list' | 'new' | Behavior>('list');
  // Include this student even if inactive, so their own behaviors still show.
  const roster = students.filter(s => s.active || s.id === student.id);
  const bank = buildBank(behaviors, roster);
  const { tracking, available } = studentOptions(bank, student.id);
  const starters = starterSuggestions(bank);

  const add = (settings: BehaviorSettings) =>
    void save('behaviors', copyForStudent(settings, student.id, new Date().toISOString(), uuid()));
  const restore = (retired: Behavior) => {
    const row: Behavior = { ...retired, active: true };
    void save('behaviors', row);
  };
  const row = 'flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2';
  const addBtn = 'min-h-9 shrink-0 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white transition active:scale-95';

  return (
    <Sheet {...bind} title={`Behaviors for ${student.code}`}
      footer={<button onClick={close} className={`${btnPrimary} w-full`}>Done</button>}>
      <section className="space-y-1">
        <h4 className="text-sm font-semibold text-slate-600">Tracking now</h4>
        {tracking.length === 0 && <p className="text-sm text-slate-500">Nothing yet. Add a behavior below.</p>}
        {tracking.map(b => (
          <button key={b.id} onClick={() => setView(b)} className={`${row} w-full text-left transition active:bg-slate-50`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{b.name}</span>
              <span className="block text-xs text-slate-500">{settingsSummary(b)}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-indigo-600">Edit</span>
          </button>
        ))}
      </section>

      {available.length > 0 && (
        <section className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-600">Already used in your class</h4>
          {available.map(({ entry, retired }) => (
            <div key={entry.key} className={row}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{entry.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {settingsSummary(entry.settings)}
                  {retired && ` · retired for ${student.code}`}
                </span>
              </span>
              {retired ? (
                <button onClick={() => restore(retired)} className={addBtn}>
                  Restore
                </button>
              ) : (
                <button onClick={() => add(entry.settings)} className={addBtn}>Add</button>
              )}
            </div>
          ))}
        </section>
      )}

      {starters.length > 0 && (
        <section className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-600">Common behaviors</h4>
          {starters.map(s => (
            <div key={s.name} className={row}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.name}</span>
                <span className="block text-xs text-slate-500">{settingsSummary(s)}</span>
              </span>
              <button onClick={() => add(s)} className={addBtn}>Add</button>
            </div>
          ))}
        </section>
      )}

      <button onClick={() => setView('new')}
        className="min-h-11 w-full rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-600">
        + Create a new behavior
      </button>
      {view === 'new' && (
        <SharedBehaviorSheet entry={null} preselect={[student.id]} onClose={() => setView('list')} />
      )}
      {view !== 'list' && view !== 'new' && (
        <StudentBehaviorSheet behavior={view} onClose={() => setView('list')} />
      )}
    </Sheet>
  );
}
