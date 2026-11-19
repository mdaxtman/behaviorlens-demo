import { useState } from 'react';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import { SharedBehaviorSheet, StudentBehaviorSheet } from '../components/BehaviorSheets';
import {
  buildBank, settingsSummary, starterSuggestions, type BehaviorSettings,
} from '../lib/behaviorBank';
import { useData } from '../lib/store';
import type { Behavior } from '../lib/types';

type Editing =
  | { kind: 'shared'; key: string }
  | { kind: 'new'; prefill?: BehaviorSettings }
  | { kind: 'student'; behavior: Behavior };

/**
 * The class's behaviors as one list. A behavior is set up once and given to any number of
 * students; each student's copy can still be changed on its own (tap their chip).
 */
export default function ManageBehaviors() {
  const { students, behaviors } = useData();
  const [editing, setEditing] = useState<Editing | null>(null);
  const active = students.filter(s => s.active);
  const bank = buildBank(behaviors, active);
  const starters = starterSuggestions(bank);
  const sharedEntry = editing?.kind === 'shared' ? bank.find(e => e.key === editing.key) : undefined;

  return (
    <div className="space-y-4">
      <PageHeader back={{ to: '/manage', label: 'Manage' }} title="Behaviors"
        action={
          <button onClick={() => setEditing({ kind: 'new' })}
            className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white">Add</button>
        } />
      <p className="text-sm text-slate-500">
        Set a behavior up once and give it to as many students as you like. Tap a behavior to
        change it for everyone, or a student under it to change it just for them.
      </p>

      {bank.length === 0 && (
        <p className="rounded-xl bg-white p-4 text-center text-slate-500 shadow-sm">
          No behaviors yet. Tap Add, or start from a common one below.
        </p>
      )}
      <ul className="space-y-2">
        {bank.map(entry => (
          <li key={entry.key} className="rounded-xl bg-white shadow-sm">
            <button onClick={() => setEditing({ kind: 'shared', key: entry.key })}
              className="flex w-full items-center gap-3 p-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{entry.name}</span>
                <span className="block text-sm text-slate-500">{settingsSummary(entry.settings)}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-indigo-600">Edit</span>
            </button>
            <ul className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
              {entry.members.map(m => (
                <li key={m.behavior.id}>
                  <button onClick={() => setEditing({ kind: 'student', behavior: m.behavior })}
                    aria-label={`${entry.name} for ${m.student.code}`}
                    className={`flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm ${
                      m.behavior.active ? '' : 'opacity-50'}`}>
                    <Avatar student={m.student} size={26} />
                    <span className="font-medium">{m.student.code}</span>
                    {!m.behavior.active
                      ? <span className="text-xs text-slate-500">retired</span>
                      : m.customized && <span className="text-xs text-amber-700">customized</span>}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {starters.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">Common behaviors</h3>
          <p className="text-sm text-slate-500">A starting point. Tap one to review it and pick students.</p>
          <ul className="flex flex-wrap gap-2">
            {starters.map(s => (
              <li key={s.name}>
                <button onClick={() => setEditing({ kind: 'new', prefill: s })}
                  className="min-h-11 rounded-full border border-slate-300 bg-white px-4 text-sm">
                  + {s.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing?.kind === 'new' && (
        <SharedBehaviorSheet entry={null} prefill={editing.prefill} onClose={() => setEditing(null)} />
      )}
      {sharedEntry && <SharedBehaviorSheet entry={sharedEntry} onClose={() => setEditing(null)} />}
      {editing?.kind === 'student' && (
        <StudentBehaviorSheet behavior={editing.behavior} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
