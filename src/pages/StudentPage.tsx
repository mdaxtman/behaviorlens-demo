import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { BackLink } from '../components/PageHeader';
import StudentForm from '../components/StudentForm';
import { studentHref } from '../lib/links';
import { useData } from '../lib/store';
import { getTimers } from '../lib/timers';
import RecordTab from './tabs/RecordTab';
import GoalsTab from './tabs/GoalsTab';
import GenerateTab from './tabs/GenerateTab';

// Charts (Recharts + html-to-image) are most of the bundle; load them only when Analytics opens.
const AnalyticsTab = lazy(() => import('./tabs/AnalyticsTab'));

const TABS = ['Record', 'Goals', 'Analytics', 'Generate'] as const;
type Tab = (typeof TABS)[number];

export default function StudentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { students, ready } = useData();
  // The tab lives in the URL (?tab=goals), so a refresh, Back, or switching student keeps it.
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find(t => t.toLowerCase() === params.get('tab')) ?? 'Record';
  const setTab = (t: Tab) => setParams(t === 'Record' ? {} : { tab: t.toLowerCase() }, { replace: true });
  const [editing, setEditing] = useState(false);
  const student = students.find(s => s.id === id);
  const currentRef = useRef<HTMLAnchorElement>(null);

  // Keep the current student visible in the switcher when the class is wider than the screen.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [id, ready]);

  if (!ready) return null;
  if (!student) {
    return (
      <div className="space-y-2">
        <BackLink to="/" label="Students" />
        <p className="py-12 text-center text-slate-500">This student no longer exists.</p>
      </div>
    );
  }

  // Everyone active, plus this student if they are inactive (reachable from the data log).
  const roster = students.filter(s => s.active || s.id === student.id)
    .sort((a, b) => a.code.localeCompare(b.code));
  const timing = new Set(getTimers().map(t => t.studentId));

  return (
    <div className="space-y-3">
      <BackLink to="/" label="Students" />

      {/* One tap to move between students mid-session, staying on the same tab. Replaces history
          so Back always returns to the Students screen, not through every student visited. */}
      <nav aria-label="Students" className="-mx-4 flex gap-1 overflow-x-auto px-3 pb-1">
        {roster.map(s => {
          const current = s.id === student.id;
          return (
            <Link key={s.id} ref={current ? currentRef : undefined} replace
              to={studentHref(s.id, tab.toLowerCase())} aria-current={current ? 'page' : undefined}
              className={`relative flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl py-1.5 transition ${
                current ? 'bg-white shadow-sm' : 'opacity-55'}`}>
              <span className={`rounded-full ${current ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}`}>
                <Avatar student={s} size={44} />
              </span>
              <span className={`text-xs ${current ? 'font-bold text-indigo-700' : 'font-medium text-slate-600'}`}>
                {s.code}
              </span>
              {timing.has(s.id) && (
                <span aria-label="timer running"
                  className="absolute right-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          {student.code}
          {student.grade && <span className="ml-2 text-sm font-normal text-slate-500">Grade {student.grade}</span>}
        </h2>
        <button onClick={() => setEditing(true)}
          className="-mr-2 min-h-11 rounded-lg px-2 text-sm font-semibold text-indigo-600 transition active:bg-indigo-50">
          Edit
        </button>
      </div>
      {!student.active && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {student.code} is inactive and hidden from the Students screen.
        </p>
      )}

      <div role="tablist" className="flex rounded-xl bg-slate-200/70 p-1">
        {TABS.map(t => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`min-h-10 flex-1 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
            {t}
          </button>
        ))}
      </div>
      {/* Keyed by student and tab: switching either starts clean (no open sheet or undo toast
          carried over) and fades the new content in. */}
      <div key={`${student.id}:${tab}`} role="tabpanel" className="page-in">
        {tab === 'Record' && <RecordTab student={student} />}
        {tab === 'Goals' && <GoalsTab student={student} />}
        {tab === 'Analytics' && (
          <Suspense fallback={<div className="py-16 text-center text-slate-400">Loading charts…</div>}>
            <AnalyticsTab student={student} />
          </Suspense>
        )}
        {tab === 'Generate' && <GenerateTab student={student} />}
      </div>

      {editing && (
        <StudentForm student={student} onClose={() => setEditing(false)}
          onDeleted={() => navigate('/', { replace: true })} />
      )}
    </div>
  );
}
