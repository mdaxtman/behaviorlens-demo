import { uuid } from '../lib/id';
import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useData } from '../lib/store';
import type { AbcPreset } from '../lib/types';

const KINDS: { kind: AbcPreset['kind']; title: string; hint: string }[] = [
  { kind: 'antecedent', title: 'Antecedents', hint: 'What happened right before the behavior.' },
  { kind: 'consequence', title: 'Consequences', hint: 'What happened right after.' },
  { kind: 'setting', title: 'Settings / locations', hint: 'Where a session takes place.' },
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
      <div className="space-y-2">
        <PageHeader back={{ to: '/manage', label: 'Manage' }} title="ABC presets" />
        <p className="text-sm text-slate-500">
          The one-tap choices offered when you record a behavior or start a session.
        </p>
      </div>
      {KINDS.map(({ kind, title, hint }) => (
        <section key={kind} className="space-y-2">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-slate-500">{hint}</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {abc_presets.filter(p => p.kind === kind && p.active)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(p => (
                // The label is not a button: only the ✕ removes, so a stray tap does nothing.
                <li key={p.id}
                  className="flex min-h-11 items-center rounded-full border border-slate-300 bg-white pl-4 text-sm">
                  {p.label}
                  <button aria-label={`Remove ${p.label}`}
                    onClick={() => {
                      if (window.confirm(`Remove "${p.label}"? Past recordings that used it keep it.`)) {
                        void removeRow('abc_presets', p.id);
                      }
                    }}
                    className="flex h-11 w-10 items-center justify-center rounded-full text-slate-400">
                    ✕
                  </button>
                </li>
              ))}
          </ul>
          <div className="flex gap-2">
            <input aria-label={`New ${kind}`} value={drafts[kind] ?? ''} placeholder={`Add ${kind}…`}
              onChange={e => setDrafts(d => ({ ...d, [kind]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void add(kind); } }}
              className="min-h-11 flex-1 rounded-xl border border-slate-300 p-3" />
            <button onClick={() => void add(kind)} disabled={!(drafts[kind] ?? '').trim()}
              className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white disabled:opacity-40">Add</button>
          </div>
        </section>
      ))}
    </div>
  );
}