import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BackupCard from '../components/BackupCard';
import { useData } from '../lib/store';
import type { Profile } from '../lib/types';

const SETUP = [
  { to: '/manage/students', label: 'Students', desc: 'Add, edit, photos, colors' },
  { to: '/manage/behaviors', label: 'Behaviors', desc: 'One list for the class; give each to any students' },
  { to: '/manage/goals', label: 'Goals', desc: 'IEP goals & criteria, per student' },
  { to: '/manage/presets', label: 'ABC presets', desc: 'Antecedents, consequences, settings' },
];
const RECORDS = [
  { to: '/manage/log', label: 'Data log', desc: 'Correct or delete past entries & sessions' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function LinkList({ links }: { links: { to: string; label: string; desc: string }[] }) {
  return (
    <ul className="space-y-2">
      {links.map(l => (
        <li key={l.to}>
          <Link to={l.to} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{l.label}</span>
              <span className="block text-sm text-slate-500">{l.desc}</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">›</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Manage() {
  const { profiles, userId, save } = useData();
  const me = profiles.find(p => p.id === userId) ?? null;
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Manage</h2>
      <Section title="Class setup">
        <LinkList links={SETUP} />
      </Section>
      <Section title="Records">
        <LinkList links={RECORDS} />
        <BackupCard />
      </Section>
      <Section title="This demo">
        <DemoCard />
        {me && <ProfileCard key={me.id} me={me} onSave={p => void save('profiles', p)} />}
      </Section>
    </div>
  );
}

/** Start over with the sample classroom, or with nothing. */
function DemoCard() {
  const { resetDemo, startEmpty } = useData();
  const { hash } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // /manage#demo (from the Demo badge) scrolls here.
  useEffect(() => {
    if (hash === '#demo') ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [hash]);

  async function run(question: string, action: () => Promise<void>, done: string) {
    if (!window.confirm(question)) return;
    await action();
    setMsg(done);
  }

  return (
    <div ref={ref} id="demo" className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">Demo data</div>
      <p className="text-sm text-slate-500">
        Everything is stored in this browser only. Export a backup first to keep your changes.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => void run(
            'Replace everything with a fresh copy of the sample classroom? Your changes and photos will be lost.',
            resetDemo, 'Sample data restored.')}
          className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-3 font-semibold text-white">
          Reset sample data
        </button>
        <button
          onClick={() => void run(
            'Remove all students and records to start from scratch? The sample data can be restored later.',
            startEmpty, 'All data cleared. Add your first student from the Students tab.')}
          className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3">
          Start empty
        </button>
      </div>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}

function ProfileCard({ me, onSave }: { me: Profile; onSave: (p: Profile) => void }) {
  const [name, setName] = useState(me.display_name);
  const [initials, setInitials] = useState(me.initials);
  const dirty = name !== me.display_name || initials !== me.initials;
  return (
    <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">
        Your profile <span className="font-normal text-slate-400">(shown as "recorded by" on events)</span>
      </div>
      <label className="block text-sm text-slate-500">Display name
        <input value={name} onChange={e => setName(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
      </label>
      <label className="block text-sm text-slate-500">Initials
        <input value={initials} maxLength={4} onChange={e => setInitials(e.target.value)} placeholder="e.g. MA"
          className="mt-1 block w-24 min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
      </label>
      <button disabled={!dirty}
        onClick={() => onSave({ ...me, display_name: name.trim(), initials: initials.trim() })}
        className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white disabled:opacity-40">
        Save
      </button>
    </div>
  );
}
