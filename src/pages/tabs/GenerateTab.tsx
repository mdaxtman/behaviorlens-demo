import { useMemo, useState } from 'react';
import { lastNDays } from '../../lib/analytics';
import { buildPrompt, type DocKind } from '../../lib/prompt';
import { useData } from '../../lib/store';
import type { Student } from '../../lib/types';

const KINDS: { kind: DocKind; label: string; desc: string }[] = [
  { kind: 'iep', label: 'IEP draft', desc: 'Present levels + behavior goals' },
  { kind: 'bip', label: 'BIP draft', desc: 'Function hypothesis + intervention plan' },
  { kind: 'progress', label: 'Progress report', desc: 'Parent-friendly goal narrative' },
];
const RANGES = [14, 30, 60, 90] as const;

export default function GenerateTab({ student }: { student: Student }) {
  const { behaviors, events, goals, goal_entries, sessions } = useData();
  const [kind, setKind] = useState<DocKind>('progress');
  const [days, setDays] = useState<number>(30);
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => buildPrompt(kind, {
    student,
    behaviors: behaviors.filter(b => b.student_id === student.id),
    events: events.filter(e => e.student_id === student.id),
    goals: goals.filter(g => g.student_id === student.id),
    goalEntries: goal_entries,
    sessions,
    range: lastNDays(days),
    rangeLabel: `last ${days} days`,
  }), [kind, days, student, behaviors, events, goals, goal_entries, sessions]);

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {KINDS.map(k => (
          <button key={k.kind} onClick={() => setKind(k.kind)}
            className={`min-h-11 rounded-xl border p-2 text-left ${
              kind === k.kind ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 bg-white'}`}>
            <div className="text-sm font-semibold">{k.label}</div>
            <div className="text-[11px] text-slate-500">{k.desc}</div>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {RANGES.map(r => (
          <button key={r} onClick={() => setDays(r)}
            className={`min-h-9 rounded-full border px-3 text-sm ${
              days === r ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}>
            {r}d
          </button>
        ))}
      </div>
      <button onClick={() => void copy()}
        className="w-full min-h-12 rounded-xl bg-indigo-600 p-3 font-semibold text-white active:scale-[0.99]">
        {copied ? '✓ Copied — paste into Claude or ChatGPT' : 'Copy prompt to clipboard'}
      </button>
      <textarea readOnly aria-label="Generated prompt preview" value={prompt} rows={16}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-600" />
    </div>
  );
}
