import { uuid } from '../lib/id';
import { useId, useRef, useState, type FormEvent } from 'react';
import Avatar, { usePhotoUrl } from './Avatar';
import Sheet, { DeleteRow } from './Sheet';
import { btnOutline, btnPrimary, btnSecondary, field } from './styles';
import { useSheet } from './useSheet';
import { useData } from '../lib/store';
import { deleteStudentPhoto, setStudentPhoto } from '../lib/photos';
import type { Student } from '../lib/types';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

/** The first color nobody has yet, so tiles are easy to tell apart. */
const freeColor = (taken: Student[]) =>
  COLORS.find(c => !taken.some(s => s.color === c)) ?? COLORS[taken.length % COLORS.length];

/**
 * Add students one after another without leaving the screen you are on. "Save & add another"
 * keeps the sheet open on a blank form, with a note of who was just added.
 */
export function AddStudents({ onClose }: { onClose: () => void }) {
  return <StudentForm student={null} allowAnother onClose={onClose} />;
}

export default function StudentForm({ student, onClose, onDeleted, allowAnother }: {
  student: Student | null;
  onClose: () => void;
  /** Called instead of onClose after the student is deleted (e.g. to leave their page). */
  onDeleted?: () => void;
  /** New students only: offers "Save & add another". */
  allowAnother?: boolean;
}) {
  const { students, save, removeRow } = useData();
  const deleted = useRef(false);
  const { close, markClean, bind } = useSheet(() => (deleted.current && onDeleted ? onDeleted() : onClose()));
  const formId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [id, setId] = useState(() => student?.id ?? uuid());
  const [code, setCode] = useState(student?.code ?? '');
  const [grade, setGrade] = useState(student?.grade ?? '');
  const [notes, setNotes] = useState(student?.notes ?? '');
  const [color, setColor] = useState(() => student?.color ?? freeColor(students));
  const [active, setActive] = useState(student?.active ?? true);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  // Follows the photo-change signal, so this updates after take/choose/remove.
  const hasPhoto = usePhotoUrl(id) != null;

  const duplicate = students.find(s => s.id !== id
    && s.code.trim().toLowerCase() === code.trim().toLowerCase() && code.trim() !== '');

  /** Backing out of a NEW student discards the photo taken for it rather than orphaning it. */
  function discardDraft() {
    if (!student) void deleteStudentPhoto(id);
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
    if (!another) { close(); return; }
    // Same sheet, blank form: no close-and-reopen between students.
    setAdded(a => [...a, row.code]);
    setId(uuid());
    setCode(''); setGrade(''); setNotes('');
    setColor(freeColor([...students.filter(s => s.id !== row.id), row]));
    markClean();
    codeRef.current?.focus();
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    await setStudentPhoto(id, file);
  }

  const preview: Student = {
    id, code: code || '??', grade: null, notes: null, color, active: true, created_at: '',
  };

  return (
    <Sheet {...bind} title={student ? `Edit ${student.code}` : 'New student'} onDismiss={discardDraft}
      footer={
        <>
          <div className="flex gap-2">
            <button type="submit" form={formId} className={`${btnPrimary} flex-1`}>Save</button>
            <button type="button" onClick={() => { discardDraft(); close(); }} className={btnSecondary}>
              {added.length > 0 ? 'Done' : 'Cancel'}
            </button>
          </div>
          {!student && allowAnother && (
            <button type="submit" form={formId} data-another="1" className={`${btnOutline} w-full`}>
              Save & add another
            </button>
          )}
        </>
      }>
      <form id={formId} onSubmit={e => void submit(e)} className="space-y-4">
        {added.length > 0 && (
          <p key={added.length} role="status"
            className="slide-down rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            ✓ Added {added.join(', ')}.
          </p>
        )}
        <div className="flex items-center gap-4">
          <Avatar student={preview} size={64} />
          <div className="flex flex-wrap gap-2">
            {/* Two inputs on purpose. `capture` opens the camera directly on Android and iPhone.
                Without it, Android 13+ routes image inputs to the system Photo Picker, which has
                no camera option — so a single "Set photo" button couldn't take a photo there. */}
            <button type="button" onClick={() => cameraRef.current?.click()}
              className={`${btnSecondary} px-3 text-sm`}>Take photo</button>
            <button type="button" onClick={() => libraryRef.current?.click()}
              className={`${btnSecondary} px-3 text-sm`}>Choose photo</button>
            {hasPhoto && (
              <button type="button" onClick={() => void deleteStudentPhoto(id)}
                className="min-h-11 rounded-xl border border-red-200 px-3 text-sm text-red-600 transition active:bg-red-50">
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
          <input ref={codeRef} required maxLength={4} value={code} onChange={e => setCode(e.target.value)}
            placeholder="JoSm" autoFocus={!student} autoCapitalize="words" autoComplete="off"
            className={field} />
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
          <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. 3" className={field} />
        </label>
        <label className="block text-sm text-slate-500">Notes <span className="text-slate-400">(optional)</span>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={field} />
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
                className={`h-11 w-11 rounded-full transition ${
                  c === color ? 'scale-90 ring-2 ring-slate-800 ring-offset-2' : 'active:scale-90'}`} />
            ))}
          </div>
        </div>
        {student && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            <span>Active <span className="text-slate-400">(untick to hide from the Students screen and keep the data)</span></span>
          </label>
        )}
        {student && (
          <DeleteRow label={`Delete ${student.code}…`}
            onDelete={() => {
              if (window.confirm(`Delete ${student.code} and all their data? This can't be undone.`)) {
                deleted.current = true;
                void Promise.all([deleteStudentPhoto(student.id), removeRow('students', student.id)]).then(close);
              }
            }} />
        )}
      </form>
    </Sheet>
  );
}
