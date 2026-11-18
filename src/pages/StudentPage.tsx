import { lazy, Suspense, useState } from 'react';
import { useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useData } from '../lib/store';
import RecordTab from './tabs/RecordTab';
import GoalsTab from './tabs/GoalsTab';
import GenerateTab from './tabs/GenerateTab';

// Charts (Recharts + html-to-image) are most of the bundle; load them only when Analytics opens.
const AnalyticsTab = lazy(() => import('./tabs/AnalyticsTab'));

const TABS = ['Record', 'Goals', 'Analytics', 'Generate'] as const;
type Tab = (typeof TABS)[number];

export default function StudentPage() {
  const { id } = useParams();
  const { students, ready } = useData();
  const [tab, setTab] = useState<Tab>('Record');
  const student = students.find(s => s.id === id);

  if (!ready) return null;
  if (!student) return <div className="py-16 text-center text-slate-500">Student not found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar student={student} size={48} />
        <h2 className="text-xl font-bold">{student.code}</h2>
      </div>
      <div className="flex rounded-xl bg-slate-200/70 p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`min-h-9 flex-1 rounded-lg text-sm font-medium ${
              tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Record' && <RecordTab student={student} />}
      {tab === 'Goals' && <GoalsTab student={student} />}
      {tab === 'Analytics' && (
        <Suspense fallback={<div className="py-16 text-center text-slate-400">Loading charts…</div>}>
          <AnalyticsTab student={student} />
        </Suspense>
      )}
      {tab === 'Generate' && <GenerateTab student={student} />}
    </div>
  );
}
