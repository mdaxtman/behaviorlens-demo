import { useState, type FormEvent } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import EventForm from '../components/EventForm';
import EventList from '../components/EventList';
import PageHeader from '../components/PageHeader';
import { DeleteRow } from '../components/Sheet';
import { fromLocalInput, toLocalInput } from '../lib/datetime';
import { selectEvents } from '../lib/eventLog';
import { useData } from '../lib/store';
import type { BehaviorEvent, Session } from '../lib/types';


export default function ManageLog() {
  const { students, events, sessions, activeSession, removeRow } = useData();
  // ?student=<id> filters to one student (deep link from a student's page; survives refresh).
  const [params, setParams] = useSearchParams();
  // Carried through filter changes so the back link still returns to where the user came from.
  const { state } = useLocation();
  const studentId = params.get('student');
  const student = students.find(s => s.id === studentId) ?? null;
  const [editingEvent, setEditingEvent] = useState<BehaviorEvent | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const recentEvents = selectEvents(events, { studentId, limit: 100 });
  const recentSessions = [...sessions]
    .sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 30);

  return (
    <div className="space-y-6">
      <PageHeader back={{ to: '/manage', label: 'Manage' }} title="Data log" />
      <section className="space-y-2">
        <h3 className="font-semibold">Recent events{student && ` · ${student.code}`}</h3>
        <p className="text-sm text-slate-500">Tap an entry to correct or delete it.</p>
        <label className="block text-sm text-slate-500">Student
          <select value={studentId ?? ''}
            onChange={e => setParams(e.target.value ? { student: e.target.value } : {}, { replace: true, state })}
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 bg-white p-3 text-slate-900">
            <option value="">All students</option>
            {[...students].sort((a, b) => a.code.localeCompare(b.code))
              .map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
          </select>
        </label>
        {recentEvents.length === 0 && (
          <p className="text-slate-500">{student ? `No events recorded for ${student.code} yet.` : 'No events recorded yet.'}</p>
        )}
        <EventList events={recentEvents} onSelect={setEditingEvent} />
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Sessions</h3>
        {recentSessions.length === 0 && <p className="text-slate-500">No sessions yet.</p>}
        <ul className="space-y-1">
          {recentSessions.map(s => (
            <li key={s.id}>
              <button onClick={() => setEditingSession(s)}
                className="flex w-full items-center justify-between rounded-xl bg-white p-3 text-left text-sm shadow-sm">
                <span><span className="font-semibold">{s.activity}</span>{s.setting && ` · ${s.setting}`}</span>
                <span className="text-xs text-slate-400">
                  {new Date(s.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {!s.ended_at && (s.id === activeSession?.id ? ' · running' : ' · never ended')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {editingEvent && <EventForm event={editingEvent} onClose={() => setEditingEvent(null)} />}
      {editingSession && (
        <SessionForm session={editingSession} onClose={() => setEditingSession(null)}
          onDelete={() => {
            if (window.confirm('Delete this session? Its events stay, untagged.')) {
              void removeRow('sessions', editingSession.id).then(() => setEditingSession(null));
            }
          }} />
      )}
    </div>
  );
}

function SessionForm({ session, onClose, onDelete }:
  { session: Session; onClose: () => void; onDelete: () => void }) {
  const { save } = useData();
  const [activity, setActivity] = useState(session.activity);
  const [startedAt, setStartedAt] = useState(toLocalInput(session.started_at));
  const [endedAt, setEndedAt] = useState(session.ended_at ? toLocalInput(session.ended_at) : '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const updated: Session = {
      ...session,
      activity: activity.trim(),
      started_at: fromLocalInput(startedAt) ?? session.started_at,
      ended_at: fromLocalInput(endedAt),
    };
    await save('sessions', updated);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h3 className="text-lg font-bold">Edit session</h3>
        <label className="block text-sm text-slate-500">Activity
          <input required value={activity} onChange={e => setActivity(e.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
        </label>
        <label className="block text-sm text-slate-500">Started
          <input type="datetime-local" required value={startedAt} onChange={e => setStartedAt(e.target.value)}
            className="mt-1 block w-full min-h-11 rounded-xl border border-slate-300 p-3" />
        </label>
        <label className="block text-sm text-slate-500">Ended (blank = still running)
          <input type="datetime-local" value={endedAt} onChange={e => setEndedAt(e.target.value)}
            className="mt-1 block w-full min-h-11 rounded-xl border border-slate-300 p-3" />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="min-h-11 flex-1 rounded-xl bg-indigo-600 p-3 font-semibold text-white">Save</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4">Cancel</button>
        </div>
        <DeleteRow label="Delete session…" onDelete={onDelete} />
      </form>
    </div>
  );
}
