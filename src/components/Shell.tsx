import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
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
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <NavLink to="/" end className={({ isActive }) =>
          `min-h-11 flex-1 py-3 text-center text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
          Students
        </NavLink>
        <NavLink to="/manage" className={({ isActive }) =>
          `min-h-11 flex-1 py-3 text-center text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
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
