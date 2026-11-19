import { useId, useState, type FormEvent } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import EventForm from '../components/EventForm';
import EventList from '../components/EventList';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import Select from '../components/Select';
import Sheet, { DeleteRow } from '../components/Sheet';
import { btnPrimary, btnSecondary, field } from '../components/styles';
import { useSheet } from '../components/useSheet';
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
        <Select label="Student" value={studentId ?? ''}
          onChange={v => setParams(v ? { student: v } : {}, { replace: true, state })}
          options={[
            { value: '', label: 'All students' },
            ...[...students].sort((a, b) => a.code.localeCompare(b.code))
              .map(s => ({ value: s.id, label: s.code, icon: <Avatar student={s} size={28} /> })),
          ]} />
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
  const { close, bind } = useSheet(onClose);
  const formId = useId();
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
    close();
  }

  return (
    <Sheet {...bind} title="Edit session"
      footer={
        <div className="flex gap-2">
          <button type="submit" form={formId} className={`${btnPrimary} flex-1`}>Save</button>
          <button type="button" onClick={close} className={btnSecondary}>Cancel</button>
        </div>
      }>
      <form id={formId} onSubmit={e => void submit(e)} className="space-y-3">
        <label className="block text-sm text-slate-500">Activity
          <input required value={activity} onChange={e => setActivity(e.target.value)} className={field} />
        </label>
        <label className="block text-sm text-slate-500">Started
          <input type="datetime-local" required value={startedAt} onChange={e => setStartedAt(e.target.value)}
            className={`${field} block`} />
        </label>
        <label className="block text-sm text-slate-500">Ended (blank = still running)
          <input type="datetime-local" value={endedAt} onChange={e => setEndedAt(e.target.value)}
            className={`${field} block`} />
        </label>
        <DeleteRow label="Delete session…" onDelete={onDelete} />
      </form>
    </Sheet>
  );
}
