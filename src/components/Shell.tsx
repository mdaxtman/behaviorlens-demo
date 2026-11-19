import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { DataProvider } from '../lib/store';
import SessionBanner from './SessionBanner';

/** A permanent reminder that this is a demo and where its data lives. */
function DemoBadge() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex min-h-9 items-center gap-1.5 rounded-full bg-amber-100 px-3 text-xs font-semibold text-amber-800">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Demo
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-72 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-lg">
          <p className="font-semibold text-slate-900">This is a demo with sample data.</p>
          <p>
            Students and entries are made up. Everything you add or change is saved in this browser
            only. Nothing is sent to a server, and it works offline.
          </p>
          <Link to="/manage#demo" onClick={() => setOpen(false)} className="block font-semibold text-indigo-600">
            Reset or export the data →
          </Link>
        </div>
      )}
    </div>
  );
}

function Chrome() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  // A new page starts at its top instead of inheriting the last page's scroll position.
  // Back/Forward (POP) is left alone so the browser can return to where the user was.
  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navType]);
  // A student's page is part of Students, so that tab stays lit there too.
  const onStudents = pathname === '/' || pathname.startsWith('/student/');
  const tab = (on: boolean) =>
    `min-h-11 flex-1 py-3 text-center text-sm font-medium ${on ? 'text-indigo-600' : 'text-slate-500'}`;
  return (
    <div className="min-h-dvh bg-slate-50 pb-20">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <NavLink to="/" className="font-bold text-indigo-600">BehaviorLens</NavLink>
        <DemoBadge />
      </header>
      <SessionBanner />
      <main className="mx-auto max-w-3xl p-4">
        <Outlet />
      </main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <NavLink to="/" aria-current={onStudents ? 'page' : undefined} className={tab(onStudents)}>
          Students
        </NavLink>
        <NavLink to="/manage" className={({ isActive }) => tab(isActive)}>
          Manage
        </NavLink>
      </nav>
    </div>
  );
}

export default function Shell() {
  return (
    <DataProvider>
      <Chrome />
    </DataProvider>
  );
}
