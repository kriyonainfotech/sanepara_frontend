import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatMoney, longDay, monthLabel } from '../../lib/format';
import { ATT_STATUS, hoursLabel, minutesLabel, time12 } from '../../lib/attendance';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';

// A member's attendance for one month (+ salary if allowed).
export default function LogsModal({ userId, month, onClose, footer }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    if (userId) api.get(`/attendance/user/${userId}`, { params: { month } }).then((r) => setData(r.data));
  }, [userId, month]);
  const s = data?.summary;

  return (
    <Modal open={!!userId} onClose={onClose} size="lg" title={data ? `${data.member.name} — ${monthLabel(month + '-01')}` : 'Attendance'}>
      {!data ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[['Present', s.present], ['Full', s.full], ['Half', s.half], ['Absent', s.absent], ['Leave', s.leave], ['Late', s.late]].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-zinc-200 py-2 text-center"><div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{l}</div><div className="text-lg font-bold tabular-nums">{v}</div></div>
            ))}
          </div>
          {s.earned !== undefined && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-zinc-50 px-4 py-3 text-sm">
              <span>Salary <b>{formatMoney(s.salary)}</b></span>
              <span>Per day <b>{formatMoney(s.dailyRate)}</b> ({s.payableDays} payable days)</span>
              <span>Paid days <b>{s.paidDays}</b></span>
              <span>Earned <b className="text-emerald-700">{formatMoney(s.earned)}</b></span>
            </div>
          )}
          <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 lg:hidden">
            {data.records.length === 0 ? (
              <li className="py-8 text-center text-sm text-zinc-400">No attendance this month.</li>
            ) : data.records.map((r) => (
              <li key={r._id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{longDay(r.date)}</span>
                  <span><Badge tone={ATT_STATUS[r.status]?.tone}>{r.status}</Badge>{r.manual && <span className="ml-1.5 text-[10px] text-zinc-400">edited</span>}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-600 tabular-nums">
                  <span><span className="font-bold text-emerald-600">IN</span> {time12(r.inTime)}{r.isLate && <span className="ml-1 text-rose-500">+{minutesLabel(r.lateMinutes)}</span>}</span>
                  <span><span className="font-bold text-rose-500">OUT</span> {time12(r.outTime)}{r.autoClockOut && <span className="ml-1 text-zinc-400">auto</span>}</span>
                  <span>{hoursLabel(r.totalHours)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden max-h-96 overflow-auto rounded-lg border border-zinc-200 lg:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-left text-xs text-zinc-500">
                <tr><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">In</th><th className="px-4 py-2 font-medium">Out</th><th className="px-4 py-2 font-medium">Hours</th><th className="px-4 py-2 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.records.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-zinc-400">No attendance this month.</td></tr>
                ) : data.records.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-2">{longDay(r.date)}</td>
                    <td className="px-4 py-2 tabular-nums">{time12(r.inTime)}{r.isLate && <span className="ml-1.5 text-xs text-rose-500">+{minutesLabel(r.lateMinutes)}</span>}</td>
                    <td className="px-4 py-2 tabular-nums">{time12(r.outTime)}{r.autoClockOut && <span className="ml-1.5 text-xs text-zinc-400">auto</span>}</td>
                    <td className="px-4 py-2">{hoursLabel(r.totalHours)}</td>
                    <td className="px-4 py-2"><Badge tone={ATT_STATUS[r.status]?.tone}>{r.status}</Badge>{r.manual && <span className="ml-1.5 text-[10px] text-zinc-400">edited</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {footer}
        </div>
      )}
    </Modal>
  );
}
