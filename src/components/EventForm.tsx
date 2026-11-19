import { useId, useState, type FormEvent } from 'react';
import { fromLocalInput, toLocalInput } from '../lib/datetime';
import Select, { type SelectOption } from './Select';
import Sheet, { DeleteRow } from './Sheet';
import { btnPrimary, btnSecondary, field } from './styles';
import { useSheet } from './useSheet';
import { useData } from '../lib/store';
import type { AbcPreset, BehaviorEvent } from '../lib/types';

/** Edit/delete sheet for one recorded event. Shared by the Data log and a student's Record tab. */
export default function EventForm({ event, onClose }: { event: BehaviorEvent; onClose: () => void }) {
  const { abc_presets, behaviors, save, removeRow } = useData();
  const { close, bind } = useSheet(onClose);
  const formId = useId();
  const behavior = behaviors.find(b => b.id === event.behavior_id);
  const [occurredAt, setOccurredAt] = useState(toLocalInput(event.occurred_at));
  const [count, setCount] = useState(String(event.count));
  const [rating, setRating] = useState(event.rating);
  const [antecedent, setAntecedent] = useState(event.antecedent ?? '');
  const [consequence, setConsequence] = useState(event.consequence ?? '');
  const [setting, setSetting] = useState(event.setting ?? '');
  const [durMin, setDurMin] = useState(
    event.duration_seconds != null ? String(Math.floor(event.duration_seconds / 60)) : '');
  const [durSec, setDurSec] = useState(
    event.duration_seconds != null ? String(event.duration_seconds % 60) : '');
  const [note, setNote] = useState(event.note ?? '');

  // Show an attribute if the behavior currently tracks it OR the event already carries a value,
  // so data recorded before a behavior's config changed stays visible and editable.
  const showRating = (behavior?.track_rating ?? false) || event.rating != null;
  const showAbc = (behavior?.requires_abc ?? false)
    || event.antecedent != null || event.consequence != null;
  const showDuration = (behavior?.track_duration ?? false) || event.duration_seconds != null;

  /** "None", the active presets, and the event's own value if that preset has since been removed. */
  const options = (kind: AbcPreset['kind'], current: string): SelectOption[] => {
    const labels = abc_presets.filter(p => p.kind === kind && p.active)
      .sort((a, b) => a.sort_order - b.sort_order).map(p => p.label);
    if (current && !labels.includes(current)) labels.push(current);
    return [{ value: '', label: 'None' }, ...labels.map(l => ({ value: l, label: l }))];
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const enteredDuration = durMin !== '' || durSec !== ''
      ? Math.max(0, (Number(durMin) || 0) * 60 + (Number(durSec) || 0))
      : 0;
    const updated: BehaviorEvent = {
      ...event,
      occurred_at: fromLocalInput(occurredAt) ?? event.occurred_at,
      count: Math.max(1, Number(count) || 1),
      duration_seconds: showDuration ? (enteredDuration > 0 ? enteredDuration : null) : event.duration_seconds,
      rating: showRating ? rating : event.rating,
      antecedent: showAbc ? (antecedent || null) : event.antecedent,
      consequence: showAbc ? (consequence || null) : event.consequence,
      setting: showAbc ? (setting || null) : event.setting,
      note: note.trim() || null,
    };
    await save('events', updated);
    close();
  }

  const small = 'w-16 min-h-11 rounded-xl border border-slate-300 p-2 text-center';
  return (
    <Sheet {...bind}
      title={<>Edit entry{behavior && <span className="font-normal text-slate-400"> · {behavior.name}</span>}</>}
      footer={
        <div className="flex gap-2">
          <button type="submit" form={formId} className={`${btnPrimary} flex-1`}>Save</button>
          <button type="button" onClick={close} className={btnSecondary}>Cancel</button>
        </div>
      }>
      <form id={formId} onSubmit={e => void submit(e)} className="space-y-3">
        <label className="block text-sm text-slate-500">When
          <input type="datetime-local" required value={occurredAt} onChange={e => setOccurredAt(e.target.value)}
            className={`${field} block`} />
        </label>
        <label className="block text-sm text-slate-500">Count
          <input type="number" inputMode="numeric" min={1} value={count} onChange={e => setCount(e.target.value)}
            className="mt-1 block w-24 min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
        </label>
        {showDuration && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Duration:</span>
            <input aria-label="Duration minutes" type="number" inputMode="numeric" min={0} value={durMin}
              onChange={e => setDurMin(e.target.value)} placeholder="0" className={small} />
            <span className="text-sm text-slate-400">min</span>
            <input aria-label="Duration seconds" type="number" inputMode="numeric" min={0} max={59} value={durSec}
              onChange={e => setDurSec(e.target.value)} placeholder="0" className={small} />
            <span className="text-sm text-slate-400">sec</span>
          </div>
        )}
        {showRating && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Intensity:</span>
            {[1, 2, 3, 4, 5].map(r => (
              <button key={r} type="button" onClick={() => setRating(rating === r ? null : r)} aria-pressed={rating === r}
                className={`h-11 w-11 rounded-full border text-sm font-semibold transition active:scale-90 ${
                  rating === r ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'}`}>
                {r}
              </button>
            ))}
          </div>
        )}
        {showAbc && (
          <>
            <Select label="Antecedent" value={antecedent} options={options('antecedent', antecedent)} onChange={setAntecedent} />
            <Select label="Consequence" value={consequence} options={options('consequence', consequence)} onChange={setConsequence} />
            <Select label="Setting" value={setting} options={options('setting', setting)} onChange={setSetting} />
          </>
        )}
        <label className="block text-sm text-slate-500">Note <span className="text-slate-400">(optional)</span>
          <input value={note} onChange={e => setNote(e.target.value)} className={field} />
        </label>
        <DeleteRow label="Delete this entry…"
          onDelete={() => {
            if (window.confirm('Delete this entry?')) void removeRow('events', event.id).then(close);
          }} />
      </form>
    </Sheet>
  );
}
