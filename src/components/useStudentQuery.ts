import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Student selection for the Manage screens, honoring deep links from a student's page
 * (`?student=<id>&new=1`, see lib/links.ts).
 *
 * - The selected student comes from `?student=` when present, else the user's pick, else the
 *   first active student. Deriving the fallback (rather than freezing it in useState) means the
 *   dropdown is never stuck empty when the student list arrives after the first render.
 * - `startWithNew` is true when the page was opened via a "new" deep link. The `new` param is
 *   then stripped (history replace), so Back or a refresh does not re-open the form.
 */
export function useStudentQuery(activeIds: string[]) {
  const [params, setParams] = useSearchParams();
  const fromLink = params.get('student');
  const [startWithNew] = useState(() => params.get('new') === '1' && !!fromLink);
  const [picked, setPicked] = useState<string | null>(fromLink);
  const studentId = (picked && activeIds.includes(picked) ? picked : null) ?? activeIds[0] ?? '';

  useEffect(() => {
    if (params.has('new')) {
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  return { studentId, setStudentId: setPicked, startWithNew };
}
