import { uuid } from '../lib/id';
import { useRef, useState, type FormEvent } from 'react';
import Avatar, { usePhotoUrl } from './Avatar';
import { DeleteRow } from './Sheet';
import { useData } from '../lib/store';
import { deleteStudentPhoto, setStudentPhoto } from '../lib/photos';
import type { Student } from '../lib/types';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

/**
 * Add students one after another without leaving the screen you are on. "Save & add another"
 * keeps the sheet open on a blank form, with a note of who was just added.
 */
export function AddStudents({ onClose }: { onClose: () => void }) {
  const [added, setAdded] = useState<string[]>([]);
  return (
    <StudentForm key={added.length} student={null} onClose={onClose}
      notice={added.length > 0 ? `Added ${added.join(', ')}.` : undefined}
      onAddAnother={code => setAdded(a => [...a, code])} />
  );
}

export default function StudentForm({ student, onClose, onDeleted, onAddAnother, notice }: {
  student: Student | null;
  onClose: () => void;
  /** Called instead of onClose after the student is deleted (e.g. to leave their page). */
  onDeleted?: () => void;
  /** New students only: offers "Save & add another" and is called with the saved code. */
  onAddAnother?: (code: string) => void;
  notice?: string;
}) {
  const { students, save, removeRow } = useData();
  const [code, setCode] = useState(student?.code ?? '');
  const [grade, setGrade] = useState(student?.grade ?? '');
  const [notes, setNotes] = useState(student?.notes ?? '');
  // A new student starts on the first color nobody else has, so tiles are easy to tell apart.
  const [color, setColor] = useState(() => student?.color
    ?? COLORS.find(c => !students.some(s => s.color === c))
    ?? COLORS[students.length % COLORS.length]);
  const [active, setActive] = useState(student?.active ?? true);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [id] = useState(() => student?.id ?? uuid());
  // Follows the photo-change signal, so this updates after take/choose/remove.
  const hasPhoto = usePhotoUrl(id) != null;

  const duplicate = students.find(s => s.id !== id
    && s.code.trim().toLowerCase() === code.trim().toLowerCase() && code.trim() !== '');

  /** Dismissing a NEW student discards the photo taken for it rather than orphaning it. */
  function cancel() {
    if (!student) void deleteStudentPhoto(id);
    onClose();
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const another = (e.nativeEvent as SubmitEvent).submitter?.dataset.another === '1';
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
    if (another && onAddAnother) onAddAnother(row.code);
    else onClose();
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
      <form onSubmit={e => void submit(e)} onClick={e => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h3 className="text-lg font-bold">{student ? `Edit ${student.code}` : 'New student'}</h3>
        {notice && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {notice}</p>}
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
            {hasPhoto && (
              <button type="button" onClick={() => void deleteStudentPhoto(id)}
                className="min-h-11 rounded-xl border border-red-200 px-3 text-sm text-red-600">
                Remove photo
              </button>
            )}
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
            placeholder="JoSm" autoFocus={!student}
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-300 p-3 text-slate-900" />
          <span className="mt-1 block text-xs text-slate-400">
            First two letters of first + last name (John Smith → JoSm). No full names.
          </span>
          {duplicate && (
            <span className="mt-1 block text-xs text-amber-700">
              Another student already uses {duplicate.code}. You can still save, but they will be hard to tell apart.
            </span>
          )}
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
          <div role="radiogroup" aria-labelledby="color-label" className="mt-1 flex flex-wrap gap-2">
            {COLORS.map((c, i) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                role="radio" aria-checked={c === color} aria-label={`Color ${i + 1}`}
                style={{ backgroundColor: c }}
                className={`h-11 w-11 rounded-full ${c === color ? 'ring-2 ring-offset-2 ring-slate-800' : ''}`} />
            ))}
          </div>
        </div>
        {student && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            Active <span className="text-slate-400">(untick to hide from the Students screen and keep the data)</span>
          </label>
        )}
        <div className="flex gap-2">
          <button type="submit"
            className="min-h-11 flex-1 rounded-xl bg-indigo-600 p-3 font-semibold text-white">Save</button>
          <button type="button" onClick={cancel}
            className="min-h-11 rounded-xl border border-slate-300 px-4">{notice ? 'Done' : 'Cancel'}</button>
        </div>
        {!student && onAddAnother && (
          <button type="submit" data-another="1"
            className="min-h-11 w-full rounded-xl border border-indigo-600 p-3 font-semibold text-indigo-700">
            Save & add another
          </button>
        )}
        {student && (
          <DeleteRow label={`Delete ${student.code}…`}
            onDelete={() => {
              if (window.confirm(`Delete ${student.code} and all their data? This can't be undone.`)) {
                void Promise.all([deleteStudentPhoto(student.id), removeRow('students', student.id)])
                  .then(onDeleted ?? onClose);
              }
            }} />
        )}
      </form>
    </div>
  );
}
