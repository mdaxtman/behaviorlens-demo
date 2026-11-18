import { uuid } from '../lib/id';
import { useRef, useState, type FormEvent } from 'react';
import Avatar, { usePhotoUrl } from '../components/Avatar';
import { useData } from '../lib/store';
import { deleteStudentPhoto, setStudentPhoto } from '../lib/photos';
import type { Student } from '../lib/types';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function ManageStudents() {
  const { students } = useData();
  const [editing, setEditing] = useState<Student | 'new' | null>(null);
  const sorted = [...students].sort((a, b) => a.code.localeCompare(b.code));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Students</h2>
        <button onClick={() => setEditing('new')}
          className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white">Add</button>
      </div>
      <ul className="space-y-2">
        {sorted.map(s => (
          <li key={s.id}>
            <button onClick={() => setEditing(s)}
              className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm">
              <Avatar student={s} size={44} />
              <div>
                <div className="font-semibold">
                  {s.code} {!s.active && <span className="text-xs text-slate-400">(inactive)</span>}
                </div>
                {s.grade && <div className="text-sm text-slate-500">Grade {s.grade}</div>}
              </div>
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <StudentForm student={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function StudentForm({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const { save, removeRow } = useData();
  const [code, setCode] = useState(student?.code ?? '');
  const [grade, setGrade] = useState(student?.grade ?? '');
  const [notes, setNotes] = useState(student?.notes ?? '');
  const [color, setColor] = useState(student?.color ?? COLORS[0]);
  const [active, setActive] = useState(student?.active ?? true);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [id] = useState(() => student?.id ?? uuid());
  // Follows the photo-change signal, so this updates after take/choose/remove.
  const hasPhoto = usePhotoUrl(id) != null;
  /** Dismissing a NEW student discards the photo taken for it rather than orphaning it. */
  function cancel() {
    if (!student) void deleteStudentPhoto(id);
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const row: Student = {
      id,
      code: code.trim(),
      grade: grade.trim() || null,
      notes: notes.trim() || null,
      color,
      active,
      created_at: student?.created_at ?? new Date().toISOString(),
    };
    await save('students', row);
    onClose();
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    await setStudentPhoto(id, file);
  }

  const preview: Student = {
    id, code: code || '??', grade: null, notes: null, color, active: true, created_at: '',
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={cancel}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h3 className="text-lg font-bold">{student ? `Edit ${student.code}` : 'New student'}</h3>
        <div className="flex items-center gap-4">
          <Avatar student={preview} size={64} />
          <div className="flex flex-wrap gap-2">
            {/* Two inputs on purpose. `capture` opens the camera directly on Android and iPhone.
                Without it, Android 13+ routes image inputs to the system Photo Picker, which has
                no camera option — so a single "Set photo" button couldn't take a photo there. */}
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm">Take photo</button>
            <button type="button" onClick={() => libraryRef.current?.click()}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm">Choose photo</button>
            <button type="button" disabled={!hasPhoto}
              onClick={() => void deleteStudentPhoto(id)}
              className="min-h-11 rounded-xl border border-red-200 px-3 text-sm text-red-600 disabled:border-slate-200 disabled:text-slate-300">
              Remove photo
            </button>
            {/* capture="environment" = rear camera (pointing the phone at the student); the user can
                still flip cameras in the camera app. Value is reset so re-picking the same file fires. */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { void onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            <input ref={libraryRef} type="file" accept="image/*" className="hidden"
              onChange={e => { void onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </div>
        <p className="text-xs text-slate-400">Photos stay on this device only — never uploaded.</p>
        {/* Real labels, not placeholders: a placeholder vanishes once the field has a value, which
            left an existing student's fields unlabeled. */}
        <label className="block text-sm text-slate-500">Student code
          <input required maxLength={4} value={code} onChange={e => setCode(e.target.value)}
            placeholder="JoSm"
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
          <span className="mt-1 block text-xs text-slate-400">
            First two letters of first + last name (John Smith → JoSm). No full names.
          </span>
        </label>
        <label className="block text-sm text-slate-500">Grade <span className="text-slate-400">(optional)</span>
          <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. 3"
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
        </label>
        <label className="block text-sm text-slate-500">Notes <span className="text-slate-400">(optional)</span>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-slate-900" />
          <span className="mt-1 block text-xs text-slate-400">
            Included in generated prompts — avoid real names or identifying details.
          </span>
        </label>
        <div>
          <div id="color-label" className="text-sm text-slate-500">Color</div>
          <div role="radiogroup" aria-labelledby="color-label" className="mt-1 flex gap-2">
            {COLORS.map((c, i) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                role="radio" aria-checked={c === color} aria-label={`Color ${i + 1}`}
                style={{ backgroundColor: c }}
                className={`h-11 w-11 rounded-full ${c === color ? 'ring-2 ring-offset-2 ring-slate-800' : ''}`} />
            ))}
          </div>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Active
        </label>
        <div className="flex gap-2">
          <button type="submit"
            className="min-h-11 flex-1 rounded-xl bg-indigo-600 p-3 font-semibold text-white">Save</button>
          <button type="button" onClick={cancel}
            className="min-h-11 rounded-xl border border-slate-300 px-4">Cancel</button>
          {student && (
            <button type="button"
              onClick={() => {
                if (window.confirm(`Delete ${student.code} and all their data?`)) {
                  void Promise.all([deleteStudentPhoto(student.id), removeRow('students', student.id)])
                    .then(onClose);
                }
              }}
              className="min-h-11 rounded-xl border border-red-200 px-4 text-red-600">Delete</button>
          )}
        </div>
      </form>
    </div>
  );
}