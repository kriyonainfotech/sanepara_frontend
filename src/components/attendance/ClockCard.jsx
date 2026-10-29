import { useEffect, useState } from 'react';
import { CalendarOff, Clock, LogIn, LogOut, Timer } from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { ATT_STATUS, elapsedSince, hoursLabel, minutesLabel, time12 } from '../../lib/attendance';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ConfirmDialog from '../ui/ConfirmDialog';
import ClockOutFlow from './ClockOutFlow';

export default function ClockCard({ onChange }) {
  const { today, refresh, clockedIn, clockIn: doClockIn } = useAttendance();
  const [, tick] = useState(0);
  const [confirmIn, setConfirmIn] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clockedIn) return;
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [clockedIn]);

  if (!today) return <Card className="h-[132px] animate-pulse bg-zinc-50" />;
  const r = today.record;
  const done = r?.outTime;

  const clockIn = async () => {
    setBusy(true);
    if (await doClockIn()) {
      setConfirmIn(false);
      onChange?.();
    }
    setBusy(false);
  };

  return (
    <Card className="overflow-hidden">
      {/* Phone: icon and button share the first row, details below. sm+: icon · details · button in one row. */}
      <div className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:p-5">
        <div className={`order-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${clockedIn ? 'bg-emerald-50 text-emerald-600' : done ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-900 text-white'}`}>
          {!today.working ? <CalendarOff className="h-5 w-5" /> : clockedIn ? <Timer className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
        </div>
        <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">
              {!today.working && !r ? `Holiday — ${today.holiday}` : clockedIn ? `Working · ${elapsedSince(r.clockIn)}` : done ? 'Day complete' : 'Not clocked in'}
            </h3>
            {r?.isLate && <Badge tone="red">Late {minutesLabel(r.lateMinutes)}</Badge>}
            {done && <Badge tone={ATT_STATUS[r.status]?.tone}>{r.status}</Badge>}
            {r?.status === 'Leave' && <Badge tone="blue">Leave</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            Shift {time12(today.shift.start)} – {time12(today.shift.end)} · Full day {today.shift.fullDayHours}h, half day {today.shift.halfDayHours}h
          </p>
          {r?.inTime && (
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span><span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">In </span><span className="font-semibold tabular-nums">{time12(r.inTime)}</span></span>
              <span><span className="text-[10px] font-bold uppercase tracking-wide text-rose-500">Out </span><span className="font-semibold tabular-nums">{time12(r.outTime)}</span></span>
              {done && <span><span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Worked </span><span className="font-semibold">{hoursLabel(r.totalHours)}</span></span>}
            </div>
          )}
        </div>
        <div className="order-2 ml-auto shrink-0 sm:order-3">
          {today.working && !r?.inTime && r?.status !== 'Leave' && <Button icon={LogIn} onClick={() => setConfirmIn(true)} className="h-10 px-5">Clock In</Button>}
          {clockedIn && <Button icon={LogOut} onClick={() => setOutOpen(true)} className="h-10 px-5 !bg-rose-600 hover:!bg-rose-700">Clock Out</Button>}
        </div>
      </div>
      <ConfirmDialog open={confirmIn} onClose={() => setConfirmIn(false)} onConfirm={clockIn} loading={busy} danger={false} confirmText="Clock In" title="Confirm clock in"
        message={`Clock in now (${time12(today.now)})? Your shift starts at ${time12(today.shift.start)}.`} />
      <ClockOutFlow open={outOpen} onClose={() => setOutOpen(false)} onDone={async () => { await refresh(); onChange?.(); }} />
    </Card>
  );
}
