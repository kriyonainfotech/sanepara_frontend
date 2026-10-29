import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronsUpDown, KeyRound, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navFor } from '../lib/nav';
import { ROLE_LABEL } from '../lib/format';
import Avatar from './ui/Avatar';
import ChangePasswordModal from './ChangePasswordModal';
import ClockPill from './attendance/ClockPill';
import ClockInPrompt from './attendance/ClockInPrompt';
import { AttendanceProvider } from '../context/AttendanceContext';

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">S</div>
      <div className="leading-tight">
        <div className="text-[13px] font-semibold tracking-tight text-zinc-900">SANEPARA</div>
        <div className="text-[10px] font-medium tracking-[0.14em] text-zinc-400">AND COMPANY</div>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg animate-pop-in">
          <button onClick={() => { setPwOpen(true); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
            <KeyRound className="h-4 w-4" /> Change password
          </button>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-zinc-100">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-900">{user.name}</div>
          <div className="truncate text-xs text-zinc-500">{ROLE_LABEL[user.role]}</div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
      </button>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function Sidebar({ onNavigate }) {
  const auth = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4"><Brand /></div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {navFor(auth).map((s) => (
          <div key={s.section}>
            <div className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">{s.section}</div>
            <div className="space-y-0.5">
              {s.items.map(({ to, label, icon: Icon, ready }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      isActive ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="flex-1 truncate">{label}</span>
                      {!ready && (
                        <span className={`rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide ring-1 ${isActive ? 'text-zinc-300 ring-zinc-700' : 'text-zinc-400 ring-zinc-200'}`}>
                          Soon
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-2 border-t border-zinc-200 p-3"><ClockPill onNavigate={onNavigate} /><UserMenu /></div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <AttendanceProvider>
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-zinc-950/30 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64 bg-white shadow-xl animate-pop-in">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100">
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100">
            <Menu className="h-5 w-5" />
          </button>
          <Brand />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    <ClockInPrompt />
    </AttendanceProvider>
  );
}
