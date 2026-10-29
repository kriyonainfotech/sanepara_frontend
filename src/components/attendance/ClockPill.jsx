import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { elapsedSince } from '../../lib/attendance';

// Small sidebar indicator: working timer, or a nudge to clock in. Super Admins don't clock in.
export default function ClockPill({ onNavigate }) {
  const { user } = useAuth();
  const { today, clockedIn } = useAttendance() || {};
  const [, tick] = useState(0);
  useEffect(() => {
    if (!clockedIn) return;
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [clockedIn]);
  if (user.role === 'superadmin' || !today || (!today.working && !today.record)) return null;
  const r = today.record;
  if (r?.outTime || r?.status === 'Leave') return null;

  return (
    <Link to="/attendance" onClick={onNavigate} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${clockedIn ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
      <span className={`h-2 w-2 rounded-full ${clockedIn ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
      {clockedIn ? <>Working · {elapsedSince(r.clockIn)}</> : 'Not clocked in — Clock in'}
    </Link>
  );
}
