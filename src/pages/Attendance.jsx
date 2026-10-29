import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarCheck, CalendarOff, CalendarPlus, Check, Clock, Pencil, Search, Trash2, UserCheck, Users, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import { formatMoney, localToday, longDay, monthLabel } from '../lib/format';
import { ATT_STATUS, hoursLabel, minutesLabel, time12 } from '../lib/attendance';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, Input } from '../components/ui/Field';
import ClockCard from '../components/attendance/ClockCard';
import AttendanceCalendar from '../components/attendance/AttendanceCalendar';
import LogsModal from '../components/attendance/LogsModal';
import EditRecordModal from '../components/attendance/EditRecordModal';

// Super Admins do not clock in, so they have no tab here.
const ROLE_TABS = [{ key: 'team', label: 'Team' }, { key: 'admin', label: 'Admins' }];

function StatBox({ icon: Icon, label, value, tone = 'zinc', sub }) {
  const tones = { green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-rose-50 text-rose-600', blue: 'bg-blue-50 text-blue-600', zinc: 'bg-zinc-100 text-zinc-600', violet: 'bg-violet-50 text-violet-600' };
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>
        <div className="text-xl font-bold tabular-nums leading-tight">{value}</div>
        {sub && <div className="truncate text-xs text-zinc-500">{sub}</div>}
      </div>
    </Card>
  );
}

// ---------------- My attendance ----------------
function MyAttendance() {
  const { refresh: refreshToday } = useAttendance();
  const [month, setMonth] = useState(localToday());
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(localToday());

  const load = useCallback(() => api.get('/attendance/me/month', { params: { month: month.slice(0, 7) } }).then((r) => setData(r.data)), [month]);
  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => Object.fromEntries((data?.records || []).map((r) => [r.date, r])), [data]);
  const s = data?.summary;
  const sel = byDay[selected];

  return (
    <div className="space-y-5">
      <ClockCard onChange={() => { load(); refreshToday(); }} />
      {!data ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatBox icon={UserCheck} label="Present" value={s.present} tone="green" sub={`${s.full} full · ${s.half} half`} />
            <StatBox icon={CalendarOff} label="Absent" value={s.absent} tone="red" sub={s.leave ? `${s.leave} leave` : `${s.workingPassed} working days so far`} />
            <StatBox icon={Clock} label="Late" value={s.late} tone="amber" sub={s.lateMinutes ? minutesLabel(s.lateMinutes) + ' total' : 'On time'} />
            <StatBox icon={CalendarCheck} label="Hours worked" value={hoursLabel(s.totalHours)} tone="violet" sub={`${s.workingDays} working days this month`} />
            <StatBox icon={Check} label="Salary earned" value={formatMoney(s.earned)} tone="blue" sub={`${formatMoney(s.dailyRate)}/day · ${s.paidDays} paid days`} />
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <AttendanceCalendar month={month} onMonthChange={setMonth} selected={selected} onSelect={setSelected} exceptions={data.exceptions}
              renderDay={(d) => {
                const r = byDay[d];
                if (!r) return null;
                const st = ATT_STATUS[r.status];
                return (
                  <div className="mt-1 space-y-0.5">
                    <span className="block truncate rounded px-1 text-[10px] font-semibold" style={{ backgroundColor: `${st.color}1a`, color: st.color }}>{st.short}</span>
                    {r.inTime && <span className="block truncate text-[10px] tabular-nums text-zinc-500">{time12(r.inTime)}{r.isLate ? ' ·L' : ''}</span>}
                  </div>
                );
              }}
            />
            <Card className="self-start p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{longDay(selected)}</div>
              {sel ? (
                <div className="mt-3 space-y-3 text-sm">
                  <Badge tone={ATT_STATUS[sel.status]?.tone}>{sel.status}</Badge>
                  <div className="grid grid-cols-2 gap-3">
                    <div><div className="text-[10px] font-bold uppercase text-emerald-600">Clock In</div><div className="font-semibold tabular-nums">{time12(sel.inTime)}</div></div>
                    <div><div className="text-[10px] font-bold uppercase text-rose-500">Clock Out</div><div className="font-semibold tabular-nums">{time12(sel.outTime)}</div></div>
                    <div><div className="text-[10px] font-bold uppercase text-zinc-400">Worked</div><div className="font-semibold">{hoursLabel(sel.totalHours)}</div></div>
                    <div><div className="text-[10px] font-bold uppercase text-zinc-400">Late</div><div className="font-semibold">{sel.isLate ? minutesLabel(sel.lateMinutes) : 'No'}</div></div>
                  </div>
                  {sel.autoClockOut && <p className="text-xs text-amber-600">You forgot to clock out — closed automatically at shift end.</p>}
                  {sel.manual && <p className="text-xs text-zinc-400">Updated by admin.</p>}
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">No attendance for this day.</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- Team attendance (day) ----------------
function TeamAttendance({ canEdit }) {
  const today = localToday();
  const [role, setRole] = useState('team');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today);
  const [q, setQ] = useState('');
  const [day, setDay] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [pending, setPending] = useState(null); // { row, status }
  const [editing, setEditing] = useState(null);
  const [logsFor, setLogsFor] = useState(null);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [busy, setBusy] = useState(false);

  const loadDay = useCallback(() => api.get('/attendance/day', { params: { date, role } }).then((r) => setDay(r.data)), [date, role]);
  const loadMonth = useCallback(() => api.get('/attendance/month', { params: { month: month.slice(0, 7), role } }).then((r) => setMonthData(r.data)), [month, role]);
  const reload = () => { loadDay(); loadMonth(); };
  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => { loadMonth(); }, [loadMonth]);

  const rows = (day?.rows || []).filter((r) => r.member.name.toLowerCase().includes(q.toLowerCase()));
  const stats = useMemo(() => {
    const st = { present: 0, full: 0, half: 0, absent: 0, leave: 0, late: 0, notMarked: 0 };
    for (const { record: r } of rows) {
      if (!r) { st.notMarked++; continue; }
      if (r.status === 'Full Day' || r.status === 'Working') { st.full++; st.present++; }
      else if (r.status === 'Half Day') { st.half++; st.present++; }
      else if (r.status === 'Leave') st.leave++;
      else st.absent++;
      if (r.isLate) st.late++;
    }
    return st;
  }, [rows]);

  const mark = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/attendance/mark', { userId: pending.row.member._id, date, status: pending.status });
      toast.success(data.message);
      setPending(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const addException = async (type) => {
    try {
      await api.post('/attendance/exceptions', { date, type, description: type === 'Holiday' ? holidayName : 'Working Sunday' });
      toast.success(type === 'Holiday' ? 'Marked as holiday' : 'Marked as working Sunday');
      setHolidayOpen(false); setHolidayName('');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const removeException = async (id) => {
    try {
      await api.delete(`/attendance/exceptions/${id}`);
      toast.success('Override removed');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const info = day?.day;
  const future = date > today;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={role} onChange={setRole} items={ROLE_TABS} />
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search member..." className="pl-9" />
        </div>
      </div>

      <AttendanceCalendar compact month={month} onMonthChange={setMonth} selected={date} onSelect={(d) => { setDate(d); if (d.slice(0, 7) !== month.slice(0, 7)) setMonth(d); }} exceptions={monthData?.exceptions}
        renderDay={(d) => {
          const c = monthData?.days?.[d];
          if (!c) return null;
          return (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {c.present > 0 && <span className="rounded bg-emerald-100 px-1 text-[9px] font-bold text-emerald-700">{c.present}</span>}
              {c.half > 0 && <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700">{c.half}</span>}
              {c.absent + c.leave > 0 && <span className="rounded bg-rose-100 px-1 text-[9px] font-bold text-rose-600">{c.absent + c.leave}</span>}
              {c.late > 0 && <span className="rounded bg-zinc-100 px-1 text-[9px] font-bold text-zinc-600">L{c.late}</span>}
            </div>
          );
        }}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatBox icon={UserCheck} label="Present" value={stats.present} tone="green" />
        <StatBox icon={Users} label="Full Days" value={stats.full} tone="green" />
        <StatBox icon={Clock} label="Half Days" value={stats.half} tone="amber" />
        <StatBox icon={CalendarOff} label="Absent / Leave" value={`${stats.absent} / ${stats.leave}`} tone="red" sub={stats.notMarked ? `${stats.notMarked} not marked` : undefined} />
        <StatBox icon={Clock} label="Late" value={stats.late} tone="violet" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/60 px-5 py-3">
          <h3 className="text-sm font-semibold">{date === today ? 'Today' : longDay(date)}{info?.exception?.description && info.exception.type === 'Holiday' ? ` — ${info.exception.description}` : ''}</h3>
          {canEdit && info && (
            <div className="flex gap-2">
              {info.exception ? (
                <Button size="sm" variant="secondary" icon={X} onClick={() => removeException(info.exception._id)}>Remove {info.exception.type}</Button>
              ) : info.sunday ? (
                <Button size="sm" variant="secondary" icon={CalendarPlus} onClick={() => addException('Working Sunday')}>Mark as Working Sunday</Button>
              ) : (
                <Button size="sm" variant="secondary" icon={CalendarOff} onClick={() => setHolidayOpen(true)}>Mark as Holiday</Button>
              )}
            </div>
          )}
        </div>
        {!day ? <Spinner /> : !info.working ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <CalendarOff className="h-8 w-8 text-zinc-400" />
            <p className="font-semibold">Non-Working Day</p>
            <p className="text-sm text-zinc-500">{info.sunday ? 'The office is closed on Sundays.' : `Holiday${info.holiday?.description ? `: ${info.holiday.description}` : ''}${info.holiday?.isPaid ? ' (paid)' : ''}.`}</p>
          </div>
        ) : (
          <>
          <div className="lg:hidden">
            {rows.length === 0 ? <p className="py-12 text-center text-sm text-zinc-400">No members found.</p> : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {rows.map((row) => {
                  const { member: m, record: r } = row;
                  const st = r?.status || 'Not Marked';
                  return (
                    <div key={m._id} className="rounded-xl border border-zinc-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => setLogsFor(m._id)} className="flex min-w-0 items-center gap-3 text-left">
                          <Avatar name={m.name} />
                          <div className="min-w-0">
                            <div className="truncate font-medium hover:underline">{m.name}</div>
                            <div className="text-xs text-zinc-500">Shift {time12(m.shiftStart)} – {time12(m.shiftEnd)}</div>
                          </div>
                        </button>
                        {canEdit && r && <button onClick={() => setEditing(row)} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"><Pencil className="h-4 w-4" /></button>}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {r ? <Badge tone={ATT_STATUS[st]?.tone}>{st}</Badge> : <span className="text-xs text-zinc-400">Not marked</span>}
                        {r?.isLate && <Badge tone="red">Late {minutesLabel(r.lateMinutes)}</Badge>}
                        {r?.autoClockOut && <span className="text-[10px] text-amber-600">auto out</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-zinc-50 py-2"><div className="text-[9px] font-black uppercase tracking-wide text-emerald-600">Clock In</div><div className="text-xs font-bold tabular-nums">{time12(r?.inTime)}</div></div>
                        <div className="rounded-lg bg-zinc-50 py-2"><div className="text-[9px] font-black uppercase tracking-wide text-rose-500">Clock Out</div><div className="text-xs font-bold tabular-nums">{time12(r?.outTime)}</div></div>
                        <div className="rounded-lg bg-zinc-50 py-2"><div className="text-[9px] font-black uppercase tracking-wide text-zinc-400">Hours</div><div className="text-xs font-bold">{r?.outTime ? hoursLabel(r.totalHours) : '—'}</div></div>
                      </div>
                      {canEdit && (
                        <div className="mt-3 grid grid-cols-4 gap-1.5">
                          {[['Full Day', 'FULL', 'bg-emerald-600'], ['Half Day', 'HALF', 'bg-amber-500'], ['Absent', 'ABSENT', 'bg-rose-500'], ['Leave', 'LEAVE', 'bg-blue-500']].map(([s, l, bg]) => (
                            <button key={s} disabled={future} onClick={() => setPending({ row, status: s })}
                              className={`h-8 rounded-md text-[10px] font-bold transition-colors disabled:opacity-40 ${st === s ? `${bg} text-white` : 'border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900'}`}>{l}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-2.5 font-semibold">Member</th>
                  <th className="px-5 py-2.5 font-semibold">Timing</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 text-right font-semibold">{canEdit ? 'Mark' : ''}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-zinc-400">No members found.</td></tr>
                ) : rows.map((row) => {
                  const { member: m, record: r } = row;
                  const st = r?.status || 'Not Marked';
                  return (
                    <tr key={m._id} className="hover:bg-zinc-50/60">
                      <td className="px-5 py-3">
                        <button onClick={() => setLogsFor(m._id)} className="flex items-center gap-3 text-left">
                          <Avatar name={m.name} />
                          <div>
                            <div className="font-medium hover:underline">{m.name}</div>
                            <div className="text-xs text-zinc-500">Shift {time12(m.shiftStart)} – {time12(m.shiftEnd)}</div>
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-5">
                          <div><div className="text-[9px] font-black uppercase tracking-wide text-emerald-600">Clock In</div><div className="text-xs font-bold tabular-nums">{time12(r?.inTime)}</div></div>
                          <div><div className="text-[9px] font-black uppercase tracking-wide text-rose-500">Clock Out</div><div className="text-xs font-bold tabular-nums">{time12(r?.outTime)}</div></div>
                          <div><div className="text-[9px] font-black uppercase tracking-wide text-zinc-400">Hours</div><div className="text-xs font-bold">{r?.outTime ? hoursLabel(r.totalHours) : '—'}</div></div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {r ? <Badge tone={ATT_STATUS[st]?.tone}>{st}</Badge> : <span className="text-xs text-zinc-400">Not marked</span>}
                          {r?.isLate && <Badge tone="red">Late {minutesLabel(r.lateMinutes)}</Badge>}
                          {r?.autoClockOut && <span className="text-[10px] text-amber-600">auto out</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-1.5">
                            {[['Full Day', 'FULL', 'bg-emerald-600'], ['Half Day', 'HALF', 'bg-amber-500'], ['Absent', 'ABSENT', 'bg-rose-500'], ['Leave', 'LEAVE', 'bg-blue-500']].map(([s, l, bg]) => (
                              <button key={s} disabled={future} onClick={() => setPending({ row, status: s })}
                                className={`h-7 rounded-md px-2.5 text-[10px] font-bold transition-colors disabled:opacity-40 ${st === s ? `${bg} text-white` : 'border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900'}`}>{l}</button>
                            ))}
                            {r && <button onClick={() => setEditing(row)} className="ml-1 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"><Pencil className="h-4 w-4" /></button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      {monthData?.exceptions?.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-2.5 text-xs font-semibold text-zinc-500">Holidays & overrides — {monthLabel(month)}</div>
          <ul className="divide-y divide-zinc-100">
            {monthData.exceptions.map((e) => (
              <li key={e._id} className="flex items-center gap-3 px-5 py-2 text-sm">
                <span className="w-28 shrink-0 text-xs font-medium sm:w-40 sm:text-sm">{longDay(e.date)}</span>
                <Badge tone={e.type === 'Holiday' ? 'red' : 'green'}>{e.type}</Badge>
                <span className="flex-1 text-zinc-500">{e.description}{e.type === 'Holiday' && (e.isPaid ? ' · paid' : ' · unpaid')}</span>
                {canEdit && <button onClick={() => removeException(e._id)} className="rounded p-1 text-zinc-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} onConfirm={mark} loading={busy} danger={false} confirmText="Confirm" title="Confirm Attendance"
        message={pending && `Mark ${pending.row.member.name} as ${pending.status} for ${longDay(date)}?`} />
      <EditRecordModal row={editing} onClose={() => setEditing(null)} onDone={reload} />
      <LogsModal userId={logsFor} month={month.slice(0, 7)} onClose={() => setLogsFor(null)} />
      <Modal open={holidayOpen} onClose={() => setHolidayOpen(false)} size="sm" title="Mark as Holiday" description={longDay(date)} footer={
        <><Button variant="secondary" onClick={() => setHolidayOpen(false)}>Cancel</Button><Button onClick={() => addException('Holiday')}>Mark Holiday</Button></>
      }>
        <Field label="Holiday name"><Input autoFocus value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g. Diwali" /></Field>
        <p className="mt-2 text-xs text-zinc-500">A holiday is paid — members get that day's salary.</p>
      </Modal>
    </div>
  );
}

// ---------------- Monthly report ----------------
function MonthlyReport() {
  const [role, setRole] = useState('team');
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [data, setData] = useState(null);
  const [logsFor, setLogsFor] = useState(null);

  useEffect(() => {
    setData(null);
    api.get('/attendance/month', { params: { month, role } }).then((r) => setData(r.data));
  }, [month, role]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={role} onChange={setRole} items={ROLE_TABS} />
        <div className="ml-auto w-44"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
      </div>
      <Card className="overflow-hidden">
        {!data ? <Spinner /> : (
          <>
          <div className="lg:hidden">
            {data.report.length === 0 ? <p className="py-12 text-center text-sm text-zinc-400">No members.</p> : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {data.report.map(({ member: m, summary: s, avgIn, avgOut }) => (
                  <div key={m._id} onClick={() => setLogsFor(m._id)} className="cursor-pointer rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} />
                      <div className="min-w-0 flex-1"><div className="truncate font-medium">{m.name}</div><div className="text-xs text-zinc-500">Shift {time12(m.shiftStart)} – {time12(m.shiftEnd)}</div></div>
                      <div className="text-right"><div className="font-semibold tabular-nums">{s.present}<span className="font-normal text-zinc-400">/{s.workingPassed}</span></div><div className="text-[10px] uppercase text-zinc-400">Present</div></div>
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-1.5 text-center">
                      {[['Full', s.full, 'text-emerald-700'], ['Half', s.half, 'text-amber-600'], ['Absent', s.absent, 'text-rose-600'], ['Leave', s.leave, 'text-blue-600'], ['Late', s.late, '']].map(([l, v, c]) => (
                        <div key={l} className="rounded-lg bg-zinc-50 py-2"><div className="text-[9px] font-semibold uppercase text-zinc-400">{l}</div><div className={`text-sm font-semibold tabular-nums ${c}`}>{v}</div></div>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-zinc-500">
                      <span>Avg in <b className="text-zinc-800">{time12(avgIn)}</b> · out <b className="text-zinc-800">{time12(avgOut)}</b></span>
                      <span>{hoursLabel(s.totalHours)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Member</th>
                  <th className="px-3 py-2.5 text-center font-medium">Present</th>
                  <th className="px-3 py-2.5 text-center font-medium">Full</th>
                  <th className="px-3 py-2.5 text-center font-medium">Half</th>
                  <th className="px-3 py-2.5 text-center font-medium">Absent</th>
                  <th className="px-3 py-2.5 text-center font-medium">Leave</th>
                  <th className="px-3 py-2.5 text-center font-medium">Late days</th>
                  <th className="px-3 py-2.5 text-center font-medium">Avg In</th>
                  <th className="px-3 py-2.5 text-center font-medium">Avg Out</th>
                  <th className="px-3 py-2.5 text-center font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.report.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-zinc-400">No members.</td></tr>
                ) : data.report.map(({ member: m, summary: s, avgIn, avgOut }) => (
                  <tr key={m._id} onClick={() => setLogsFor(m._id)} className="cursor-pointer hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3"><Avatar name={m.name} /><div><div className="font-medium">{m.name}</div><div className="text-xs text-zinc-500">Shift {time12(m.shiftStart)} – {time12(m.shiftEnd)}</div></div></div>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold tabular-nums">{s.present}<span className="font-normal text-zinc-400">/{s.workingPassed}</span></td>
                    <td className="px-3 py-3 text-center tabular-nums text-emerald-700">{s.full}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-amber-600">{s.half}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-rose-600">{s.absent}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-blue-600">{s.leave}</td>
                    <td className="px-3 py-3 text-center tabular-nums">{s.late}{s.lateMinutes > 0 && <div className="text-[11px] text-zinc-400">{minutesLabel(s.lateMinutes)}</div>}</td>
                    <td className="px-3 py-3 text-center tabular-nums">{time12(avgIn)}</td>
                    <td className="px-3 py-3 text-center tabular-nums">{time12(avgOut)}</td>
                    <td className="px-3 py-3 text-center">{hoursLabel(s.totalHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
      <p className="text-xs text-zinc-400">Click a member to see every day's clock in / out. Present is counted against working days so far ({data?.report[0]?.summary.workingPassed ?? '—'}).</p>
      <LogsModal userId={logsFor} month={month} onClose={() => setLogsFor(null)} />
    </div>
  );
}

export default function Attendance() {
  const { user, can } = useAuth();
  const canView = can('attendance', 'view');
  // Super Admins don't clock in, so they have no "My Attendance" tab.
  const clocks = user.role !== 'superadmin';
  const [tab, setTab] = useState(clocks ? 'mine' : 'team');
  const items = [...(clocks ? [{ key: 'mine', label: 'My Attendance' }] : []), ...(canView ? [{ key: 'team', label: 'Team Attendance' }, { key: 'report', label: 'Monthly Report' }] : [])];

  return (
    <div>
      <PageHeader title="Attendance" description={clocks ? `Clock in / out, ${canView ? "everyone's attendance and the monthly team report" : 'your attendance and salary this month'}. Sunday is a holiday.` : "Everyone's attendance and the monthly team report. Sunday is a holiday."} />
      {items.length > 1 && <Tabs className="mb-5" value={tab} onChange={setTab} items={items} />}
      {tab === 'mine' && clocks && <MyAttendance />}
      {tab === 'team' && canView && <TeamAttendance canEdit={can('attendance', 'edit')} />}
      {tab === 'report' && canView && <MonthlyReport />}
    </div>
  );
}
