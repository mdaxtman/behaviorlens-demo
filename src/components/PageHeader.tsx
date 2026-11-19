import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { backFromState, type BackTarget } from '../lib/links';

/**
 * "‹ Parent" link at the top of a sub-page. It leads to the page's usual parent unless the page
 * was reached from somewhere else that asked to be returned to (see backState in lib/links).
 */
export function BackLink({ to, label }: BackTarget) {
  const target = backFromState(useLocation().state) ?? { to, label };
  return (
    <Link to={target.to}
      className="-ml-1 inline-flex min-h-11 items-center gap-1 pr-3 text-sm font-semibold text-indigo-600">
      <span aria-hidden="true" className="text-lg leading-none">‹</span>{target.label}
    </Link>
  );
}

/** Back link, page title and an optional action (usually "Add") for a sub-page. */
export default function PageHeader({ back, title, action }:
  { back: BackTarget; title: ReactNode; action?: ReactNode }) {
  return (
    <div>
      <BackLink {...back} />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {action}
      </div>
    </div>
  );
}
