import { deletePhoto, getPhoto, getPhotoIds, putPhoto } from './db';
import { notifyPhotoChange } from './photoEvents';

/** Downscale to <=max px on the long edge, JPEG. Keeps IndexedDB small. */
export async function resizeImage(file: Blob, max = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.85),
  );
}

export async function setStudentPhoto(studentId: string, file: Blob) {
  await putPhoto(studentId, await resizeImage(file));
  notifyPhotoChange(studentId);
}

export async function deleteStudentPhoto(studentId: string) {
  await deletePhoto(studentId);
  notifyPhotoChange(studentId);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(bin)}`;
}

/** Every stored photo as student id -> data URL, for a backup file. */
export async function exportPhotos(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of await getPhotoIds()) {
    const blob = await getPhoto(id);
    if (blob) out[id] = await blobToDataUrl(blob);
  }
  return out;
}

/** Decode a base64 data URL without fetch(), which the CSP's connect-src would block. */
export function dataUrlToBlob(url: string): Blob {
  const [head, body = ''] = url.split(',', 2);
  const type = /^data:([^;,]+)/.exec(head)?.[1] ?? 'application/octet-stream';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Store photos from a backup (data URLs; already validated as data:image/ by parseBackup). */
export async function importPhotos(photos: Record<string, string>) {
  for (const [id, url] of Object.entries(photos)) {
    await putPhoto(id, dataUrlToBlob(url));
    notifyPhotoChange(id);
  }
}
