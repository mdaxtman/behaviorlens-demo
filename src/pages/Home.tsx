import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useData } from '../lib/store';

export default function Home() {
  const { students, ready } = useData();
  const active = students.filter(s => s.active).sort((a, b) => a.code.localeCompare(b.code));
  if (!ready) return null;
  if (active.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500">
        No students yet.{' '}
        <Link to="/manage/students" className="font-semibold text-indigo-600">Add students</Link>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {active.map(s => (
        <Link key={s.id} to={`/student/${s.id}`}
          className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm transition active:scale-95">
          <Avatar student={s} size={72} />
          <span className="font-bold">{s.code}</span>
        </Link>
      ))}
    </div>
  );
}
