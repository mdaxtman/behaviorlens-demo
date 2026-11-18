import { useEffect, useState } from 'react';
import { getPhoto } from '../lib/db';
import { onPhotoChange } from '../lib/photoEvents';
import type { Student } from '../lib/types';

export function usePhotoUrl(studentId: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  // Bumped when this student's photo changes anywhere in the app, which re-reads it below.
  const [version, setVersion] = useState(0);
  useEffect(() => onPhotoChange(id => { if (id === studentId) setVersion(v => v + 1); }), [studentId]);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void getPhoto(studentId).then(blob => {
      if (cancelled) return;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } else {
        setUrl(null);
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [studentId, version]);
  return url;
}

export default function Avatar({ student, size = 56 }: { student: Student; size?: number }) {
  const url = usePhotoUrl(student.id);
  if (url) {
    return <img src={url} alt={student.code} style={{ width: size, height: size }}
      className="rounded-full object-cover" />;
  }
  return (
    <div style={{ width: size, height: size, backgroundColor: student.color }}
      className="flex items-center justify-center rounded-full font-bold text-white">
      <span style={{ fontSize: size / 3.2 }}>{student.code}</span>
    </div>
  );
}
