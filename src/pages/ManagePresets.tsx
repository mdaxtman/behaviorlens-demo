import { uuid } from '../lib/id';
import { useState } from 'react';
import { useData } from '../lib/store';
import type { AbcPreset } from '../lib/types';

const KINDS: { kind: AbcPreset['kind']; title: string }[] = [
  { kind: 'antecedent', title: 'Antecedents' },
  { kind: 'consequence', title: 'Consequences' },
  { kind: 'setting', title: 'Settings / locations' },
];

export default function ManagePresets() {
  const { abc_presets, save, removeRow } = useData();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function add(kind: AbcPreset['kind']) {
    const label = (drafts[kind] ?? '').trim();
    if (!label) return;
    const siblings = abc_presets.filter(p => p.kind === kind);
    const row: AbcPreset = {
      id: uuid(), kind, label,
      sort_order: Math.max(0, ...siblings.map(p => p.sort_order)) + 1,
      active: true, created_at: new Date().toISOString(),
    };
    await save('abc_presets', row);
    setDrafts(d => ({ ...d, [kind]: '' }));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">ABC presets</h2>
      {KINDS.map(({ kind, title }) => (
        <section key={kind} className="space-y-2">
          <h3 className="font-semibold">{title}</h3>
          <ul className="flex flex-wrap gap-2">
            {abc_presets.filter(p => p.kind === kind && p.active)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove "${p.label}"?`)) void removeRow('abc_presets', p.id);
                    }}
                    className="min-h-11 rounded-full border border-slate-300 bg-white px-4 text-sm">
                    {p.label} ✕
                  </button>
                </li>
              ))}
          </ul>
          <div className="flex gap-2">
            <input aria-label={`New ${kind}`} value={drafts[kind] ?? ''} placeholder={`Add ${kind}…`}
              onChange={e => setDrafts(d => ({ ...d, [kind]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void add(kind); } }}
              className="min-h-11 flex-1 rounded-xl border border-slate-300 p-3" />
            <button onClick={() => void add(kind)}
              className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white">Add</button>
          </div>
        </section>
      ))}
    </div>
  );
}