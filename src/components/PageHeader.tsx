import { useContext, useLayoutEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { HeaderBackContext } from '../lib/headerBack';
import { backFromState, type BackTarget } from '../lib/links';

/**
 * Gives a sub-page its "‹ Parent" link. The link itself is drawn in the app's top bar, which
 * stays on screen while the page scrolls, so this renders nothing where it is placed.
 *
 * It leads to the page's usual parent unless the page was reached from somewhere else that
 * asked to be returned to (see backState in lib/links).
 */
export function BackLink({ to, label }: BackTarget) {
  const setBack = useContext(HeaderBackContext);
  const from = backFromState(useLocation().state);
  const target = from ?? { to, label };
  // Layout effect: the bar shows the right link on the page's first paint, with no flash.
  useLayoutEffect(() => {
    setBack({ to: target.to, label: target.label });
    return () => setBack(null);
  }, [setBack, target.to, target.label]);
  return null;
}

/** Back link (in the top bar), page title and an optional action (usually "Add"). */
export default function PageHeader({ back, title, action }:
  { back: BackTarget; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <BackLink {...back} />
      <h2 className="text-xl font-bold">{title}</h2>
      {action}
    </div>
  );
}
