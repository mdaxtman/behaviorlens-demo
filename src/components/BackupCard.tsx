import { useRef, useState } from 'react';
import { backupFilename, backupSummary, downloadJson, parseBackup, type Backup } from '../lib/backup';
import { useData } from '../lib/store';

/** Export everything to a JSON file, or load a backup file back in. */
export default function BackupCard() {
  const { exportBackup, importBackup } = useData();
  const [includePhotos, setIncludePhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Backup | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onExport() {
    setBusy(true);
    setMsg(null);
    try {
      const backup = await exportBackup(includePhotos);
      downloadJson(backupFilename(), backup);
      setMsg({ ok: true, text: `Exported ${backupSummary(backup)}.` });
    } catch (err) {
      setMsg({ ok: false, text: `Export failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  async function onImport(mode: 'merge' | 'replace') {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(pending, mode);
      setMsg({ ok: true, text: `Imported ${backupSummary(pending)}.` });
      setPending(null);
    } catch (err) {
      setMsg({ ok: false, text: `Import failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">
        Backup <span className="font-normal text-slate-400">(JSON file)</span>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={includePhotos} onChange={e => setIncludePhotos(e.target.checked)} />
        Include student photos
      </label>
      <div className="flex gap-2">
        <button onClick={() => void onExport()} disabled={busy}
          className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-4 font-semibold text-white disabled:opacity-40">
          Export all data
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 disabled:opacity-40">
          Import…
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Backup file"
          onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {pending && (
        <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm">
          <p>This file has {backupSummary(pending)}.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void onImport('merge')} disabled={busy}
              className="min-h-11 rounded-xl bg-indigo-600 px-3 font-semibold text-white disabled:opacity-40">
              Add to current data
            </button>
            <button onClick={() => void onImport('replace')} disabled={busy}
              className="min-h-11 rounded-xl border border-red-200 bg-white px-3 text-red-600 disabled:opacity-40">
              Replace current data
            </button>
            <button onClick={() => setPending(null)} disabled={busy}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3">Cancel</button>
          </div>
        </div>
      )}
      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
    </div>
  );
}
