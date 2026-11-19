import { useState } from 'react';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import StudentForm, { AddStudents } from '../components/StudentForm';
import { useData } from '../lib/store';
import type { Student } from '../lib/types';

export default function ManageStudents() {
  const { students } = useData();
  const [editing, setEditing] = useState<Student | 'new' | null>(null);
  const sorted = [...students].sort((a, b) => a.code.localeCompare(b.code));
  return (
    <div className="space-y-4">
      <PageHeader back={{ to: '/manage', label: 'Manage' }} title="Students"
        action={
          <button onClick={() => setEditing('new')}
            className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white">Add</button>
        } />
      {sorted.length === 0 && (
        <p className="py-8 text-center text-slate-500">No students yet. Tap Add to enter your first one.</p>
      )}
      <ul className="space-y-2">
        {sorted.map(s => (
          <li key={s.id}>
            <button onClick={() => setEditing(s)}
              className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm">
              <Avatar student={s} size={44} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {s.code} {!s.active && <span className="text-xs text-slate-400">(inactive)</span>}
                </div>
                {s.grade && <div className="text-sm text-slate-500">Grade {s.grade}</div>}
              </div>
              <span aria-hidden="true" className="text-slate-300">›</span>
            </button>
          </li>
        ))}
      </ul>
      {editing === 'new' && <AddStudents onClose={() => setEditing(null)} />}
      {editing && editing !== 'new' && <StudentForm student={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
