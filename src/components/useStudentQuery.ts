import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Student selection for a Manage screen, honoring a `?student=<id>` link.
 *
 * The selected student comes from `?student=` when present, else the user's pick, else the
 * first active student. Deriving the fallback (rather than freezing it in useState) means the
 * dropdown is never stuck empty when the student list arrives after the first render.
 */
export function useStudentQuery(activeIds: string[]) {
  const [params] = useSearchParams();
  const [picked, setPicked] = useState<string | null>(params.get('student'));
  const studentId = (picked && activeIds.includes(picked) ? picked : null) ?? activeIds[0] ?? '';
  return { studentId, setStudentId: setPicked };
}
