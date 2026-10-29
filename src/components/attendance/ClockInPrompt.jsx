import { useEffect, useState } from 'react';
import { Clock, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { longDay } from '../../lib/format';
import { minutesLabel, time12 } from '../../lib/attendance';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const nowHHmm = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// Pops up when a Team member or Admin opens the CRM without having clocked in
// today. "Later" hides it until the CRM is opened again (new tab / visit).
export default function ClockInPrompt() {
  const { user } = useAuth();
  const { today, clockIn } = useAttendance() || {};
  const [dismissed, setDismissed] = useState(true);
  const [now, setNow] = useState(nowHHmm());
  const [busy, setBusy] = useState(false);

  const key = today && `clockin_prompt_${user._id}_${today.today}`;
  const eligible =
    (user.role === 'team' || user.role === 'admin') &&
    today?.working &&
    !today.record?.inTime &&
    today.record?.status !== 'Leave';

  useEffect(() => {
    if (key) setDismissed(sessionStorage.getItem(key) === '1');
  }, [key]);

  useEffect(() => {
    if (!eligible || dismissed) return;
    const t = setInterval(() => setNow(nowHHmm()), 20000);
    return () => clearInterval(t);
  }, [eligible, dismissed]);

  if (!eligible || dismissed) return null;

  const later = () => {
    sessionStorage.setItem(key, '1');
    setDismissed(true);
  };
  const go = async () => {
    setBusy(true);
    const ok = await clockIn();
    setBusy(false);
    if (ok) later();
  };

  const late = Math.max(0, toMin(now) - toMin(today.shift.start));

  return (
    <Modal open onClose={later} size="sm" title="" footer={null}>
      <div className="-mt-4 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white">
          <Clock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">Good {Number(now.slice(0, 2)) < 12 ? 'morning' : Number(now.slice(0, 2)) < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}</h2>
        <p className="mt-1 text-sm text-zinc-500">{longDay(today.today)}</p>

        <div className="my-5 w-full rounded-xl border border-zinc-200 bg-zinc-50 py-4">
          <div className="text-3xl font-semibold tabular-nums tracking-tight">{time12(now)}</div>
          <div className="mt-1 text-xs text-zinc-500">Your shift: {time12(today.shift.start)} – {time12(today.shift.end)}</div>
          {late > 0 ? (
            <div className="mt-2 inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">You'll be marked late by {minutesLabel(late)}</div>
          ) : (
            <div className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">You're on time</div>
          )}
        </div>

        <Button icon={LogIn} onClick={go} loading={busy} className="h-11 w-full justify-center text-base">Clock In Now</Button>
        <button onClick={later} className="mt-3 text-sm text-zinc-500 hover:text-zinc-900">Later</button>
      </div>
    </Modal>
  );
}
