import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatMoney, ROLE_LABEL } from '../lib/format';
import Avatar from './ui/Avatar';
import Badge from './ui/Badge';
import Spinner from './ui/Spinner';

// Month-wise performance of every active member (tasks, attendance, sales, referrals).
export default function TeamPerformance({ month, compact = false }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    api.get('/reports/team-performance', { params: { month } }).then((r) => setData(r.data.data));
  }, [month]);

  if (!data) return <Spinner />;
  if (!data.length) return <p className="py-10 text-center text-sm text-zinc-400">No active members.</p>;
  const rows = compact ? [...data].sort((a, b) => (b.tasks.rate ?? -1) - (a.tasks.rate ?? -1)) : data;

  return (
    <>
    {/* Phones & tablets: one card per member */}
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
      {rows.map((r) => (
        <div key={r.member._id} className="rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2.5">
            <Avatar name={r.member.name} />
            <div className="min-w-0 flex-1"><div className="truncate font-medium">{r.member.name}</div><div className="text-xs text-zinc-400">{r.member.designation || ROLE_LABEL[r.member.role]}</div></div>
            {r.tasks.overdue > 0 && <Badge tone="red">{r.tasks.overdue} overdue</Badge>}
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Tasks done</span><span className="tabular-nums">{r.tasks.total ? `${r.tasks.done}/${r.tasks.total}` : 'No tasks'}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">{r.tasks.total > 0 && <div className={`h-full rounded-full ${r.tasks.rate >= 80 ? 'bg-emerald-500' : r.tasks.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${r.tasks.rate}%` }} />}</div>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Present</dt><dd className="font-semibold tabular-nums">{r.attendance ? r.attendance.present : <span className="text-zinc-300">—</span>}</dd></div>
            <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Late</dt><dd className={`font-semibold tabular-nums ${r.attendance?.late ? 'text-amber-600' : ''}`}>{r.attendance ? r.attendance.late : <span className="text-zinc-300">—</span>}</dd></div>
            <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Incentive</dt><dd className="font-semibold tabular-nums">{formatMoney(r.referrals.incentive)}</dd></div>
          </dl>
          {!compact && (
            <div className="mt-2 flex justify-between text-xs text-zinc-500">
              <span>Sales <b className="text-zinc-800">{formatMoney(r.sales.amount)}</b> ({r.sales.count})</span>
              <span>Customers added <b className="text-zinc-800">{r.customersAdded}</b></span>
            </div>
          )}
        </div>
      ))}
    </div>

    {/* Laptop and up: table */}
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full whitespace-nowrap text-sm">
        <thead><tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
          <th className="px-5 py-2.5 font-medium">Member</th>
          <th className="px-3 py-2.5 font-medium">Tasks done</th>
          <th className="px-3 py-2.5 text-center font-medium">Overdue</th>
          <th className="px-3 py-2.5 text-center font-medium">Present</th>
          <th className="px-3 py-2.5 text-center font-medium">Late</th>
          {!compact && <th className="px-3 py-2.5 text-right font-medium">Sales</th>}
          {!compact && <th className="px-3 py-2.5 text-center font-medium">Customers added</th>}
          <th className="px-5 py-2.5 text-right font-medium">Referrals · Incentive</th>
        </tr></thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <tr key={r.member._id} className="hover:bg-zinc-50/60">
              <td className="px-5 py-2.5">
                <div className="flex items-center gap-2.5"><Avatar name={r.member.name} size="sm" /><div><div className="font-medium">{r.member.name}</div><div className="text-[11px] text-zinc-400">{r.member.designation || ROLE_LABEL[r.member.role]}</div></div></div>
              </td>
              <td className="px-3 py-2.5">
                {r.tasks.total ? (
                  <div className="flex w-40 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full ${r.tasks.rate >= 80 ? 'bg-emerald-500' : r.tasks.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${r.tasks.rate}%` }} /></div>
                    <span className="w-14 text-right text-xs tabular-nums text-zinc-600">{r.tasks.done}/{r.tasks.total}</span>
                  </div>
                ) : <span className="text-xs text-zinc-300">No tasks</span>}
              </td>
              <td className="px-3 py-2.5 text-center">{r.tasks.overdue ? <Badge tone="red">{r.tasks.overdue}</Badge> : <span className="text-zinc-300">0</span>}</td>
              {/* Super Admins do not clock in: no attendance */}
              <td className="px-3 py-2.5 text-center tabular-nums">{!r.attendance ? <span className="text-zinc-300">—</span> : <>{r.attendance.present}{r.attendance.half > 0 && <span className="text-[11px] text-zinc-400"> ({r.attendance.half} half)</span>}</>}</td>
              <td className="px-3 py-2.5 text-center">{!r.attendance ? <span className="text-zinc-300">—</span> : r.attendance.late ? <Badge tone="amber">{r.attendance.late}</Badge> : <span className="text-zinc-300">0</span>}</td>
              {!compact && <td className="px-3 py-2.5 text-right tabular-nums">{r.sales.count ? <>{formatMoney(r.sales.amount)}<div className="text-[11px] text-zinc-400">{r.sales.count} sale{r.sales.count === 1 ? '' : 's'}</div></> : <span className="text-zinc-300">—</span>}</td>}
              {!compact && <td className="px-3 py-2.5 text-center tabular-nums">{r.customersAdded || <span className="text-zinc-300">0</span>}</td>}
              <td className="px-5 py-2.5 text-right tabular-nums">{r.referrals.converted ? <>{r.referrals.converted} · <b>{formatMoney(r.referrals.incentive)}</b></> : <span className="text-zinc-300">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
