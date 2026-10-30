import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Banknote, CalendarDays, Gift, IndianRupee, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, localToday, longDay, monthLabel, ROLE_LABEL } from '../lib/format';
import { minutesLabel, time12 } from '../lib/attendance';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { Field, Input, Select } from '../components/ui/Field';
import LogsModal from '../components/attendance/LogsModal';
import BankSelect from '../components/BankSelect';

function Summary({ label, value, icon: Icon, tone, sub }) {
  const tones = { zinc: 'bg-zinc-100 text-zinc-700', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600' };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-zinc-500 sm:text-sm">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></span></div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </Card>
  );
}

function PayDialog({ row, month, onClose, onDone }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (row) setForm({ amount: row.balance || '', paidOn: localToday(), mode: 'Bank', bank: '', note: '' });
  }, [row]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/payroll/payments', { userId: row.member._id, month, ...form });
      toast.success('Salary payment recorded');
      onDone(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal open={!!row} onClose={onClose} title="Pay Salary" description={row && `${row.member.name} · salary for ${monthLabel(month + '-01')}`} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="pay-form" loading={saving}>Record Payment</Button></>
    }>
      {row && (
        <form id="pay-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-50 p-3 text-center text-sm">
            <div><div className="text-[10px] font-bold uppercase text-zinc-400">Earned{row.incentive > 0 && ' + incentive'}</div><div className="font-semibold">{formatMoney(row.total ?? row.summary.earned)}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-zinc-400">Paid</div><div className="font-semibold">{formatMoney(row.paid)}</div></div>
            <div><div className="text-[10px] font-bold uppercase text-zinc-400">Balance</div><div className="font-semibold text-emerald-700">{formatMoney(row.balance)}</div></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₹)" required><Input type="number" min="1" required value={form.amount} onChange={set('amount')} /></Field>
            <Field label="Paid on" required><Input type="date" required value={form.paidOn} onChange={set('paidOn')} /></Field>
            <Field label="Mode">
              <Select value={form.mode} onChange={set('mode')}>{['Bank', 'UPI', 'Cash', 'Cheque'].map((m) => <option key={m}>{m}</option>)}</Select>
            </Field>
            <Field label="Note"><Input value={form.note} onChange={set('note')} placeholder="Optional" /></Field>
            <BankSelect label="Paid from" value={form.bank} onChange={(v) => setForm({ ...form, bank: v })} className="sm:col-span-2" />
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function Payroll() {
  const { can } = useAuth();
  const canPay = can('payroll', 'manage');
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [role, setRole] = useState('all');
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paying, setPaying] = useState(null);
  const [logsFor, setLogsFor] = useState(null);

  const load = useCallback(() => {
    setData(null);
    return Promise.all([api.get('/payroll', { params: { month } }), api.get('/payroll/payments', { params: { month } })]).then(([p, pay]) => {
      setData(p.data);
      setPayments(pay.data.data);
    });
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const removePayment = async (id) => {
    if (!window.confirm('Remove this salary payment?')) return;
    try {
      await api.delete(`/payroll/payments/${id}`);
      toast.success('Payment removed');
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const list = (data?.list || []).filter((r) => role === 'all' || r.member.role === role);
  const s = data?.stats;
  const logsRow = data?.list.find((r) => r.member._id === logsFor);

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Salary from attendance — per-day rate × paid days (Full Day 1, Half Day ½, paid holiday 1). Sundays off. Incentive is shown separately and added to the final total."
        actions={<div className="w-44"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>}
      />
      {!data ? <Spinner /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
            <Summary label="Total payroll" value={formatMoney(s.totalPayroll)} icon={IndianRupee} tone="zinc" sub={`${data.list.length} members · ${s.workingDays} working days`} />
            <Summary label="Earned till date" value={formatMoney(s.earned)} icon={TrendingUp} tone="blue" sub="From attendance so far" />
            <Summary label="Incentive" value={formatMoney(s.incentive || 0)} icon={Gift} tone="amber" sub={`Final total ${formatMoney(s.total ?? s.earned)}`} />
            <Summary label="Paid" value={formatMoney(s.paid)} icon={Banknote} tone="green" sub={`${payments.length} payment${payments.length === 1 ? '' : 's'}`} />
            <Summary label="Balance to pay" value={formatMoney(s.balance)} icon={Wallet} tone="amber" />
          </div>

          <Tabs className="mb-4" value={role} onChange={setRole} items={[{ key: 'all', label: 'All' }, { key: 'team', label: 'Team' }, { key: 'admin', label: 'Admins' }]} />

          <Card className="overflow-hidden">
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
              {list.length === 0 ? (
                <p className="py-12 text-center text-sm text-zinc-400 sm:col-span-2">No members.</p>
              ) : list.map((row) => {
                const { member: m, summary: x } = row;
                return (
                  <div key={m._id} className="rounded-xl border border-zinc-200 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{m.name}</div>
                        <div className="truncate text-xs text-zinc-500">{m.designation || ROLE_LABEL[m.role]} · {time12(m.shiftStart)} – {time12(m.shiftEnd)}</div>
                      </div>
                      <div className="text-right text-xs tabular-nums">
                        <div className="font-semibold">{x.salary ? formatMoney(x.salary) : <span className="text-zinc-400">Not set</span>}</div>
                        <div className="text-zinc-400">{formatMoney(x.dailyRate)}/day</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      <Badge tone="green">{x.full} F</Badge>
                      <Badge tone="amber">{x.half} H</Badge>
                      <Badge tone="red">{x.absent} A</Badge>
                      {x.leave > 0 && <Badge tone="blue">{x.leave} L</Badge>}
                      {x.late > 0 && <Badge>Late {x.late} · {minutesLabel(x.lateMinutes)}</Badge>}
                      <span className="ml-auto text-xs text-zinc-500">Paid days <b className="tabular-nums text-zinc-800">{x.paidDays}</b>/{x.payableDays}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Earned</dt><dd className="text-sm font-semibold tabular-nums">{formatMoney(x.earned)}</dd></div>
                      <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Incentive</dt><dd className="text-sm tabular-nums">{row.incentive ? formatMoney(row.incentive) : '—'}</dd></div>
                      <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Final total</dt><dd className="text-sm font-semibold tabular-nums">{formatMoney(row.total ?? x.earned)}</dd></div>
                      <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Paid</dt><dd className="text-sm tabular-nums text-emerald-700">{formatMoney(row.paid)}</dd></div>
                      <div className="col-span-2 rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Balance</dt><dd className="text-sm font-semibold tabular-nums">{formatMoney(row.balance)}</dd></div>
                    </dl>
                    <div className="mt-3 flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" icon={CalendarDays} onClick={() => setLogsFor(m._id)}>Logs</Button>
                      {canPay && <Button size="sm" onClick={() => setPaying(row)} disabled={!x.salary && !row.incentive}>Pay</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                    <th className="px-5 py-2.5 font-medium">Member</th>
                    <th className="px-3 py-2.5 text-right font-medium">Salary</th>
                    <th className="px-3 py-2.5 text-center font-medium">Attendance</th>
                    <th className="px-3 py-2.5 text-center font-medium">Paid days</th>
                    <th className="px-3 py-2.5 text-right font-medium">Earned</th>
                    <th className="px-3 py-2.5 text-right font-medium">Incentive</th>
                    <th className="px-3 py-2.5 text-right font-medium">Final total</th>
                    <th className="px-3 py-2.5 text-right font-medium">Paid</th>
                    <th className="px-3 py-2.5 text-right font-medium">Balance</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {list.length === 0 ? (
                    <tr><td colSpan={10} className="py-12 text-center text-zinc-400">No members.</td></tr>
                  ) : list.map((row) => {
                    const { member: m, summary: x } = row;
                    return (
                      <tr key={m._id} className="hover:bg-zinc-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={m.name} />
                            <div>
                              <div className="font-medium">{m.name}</div>
                              <div className="text-xs text-zinc-500">{m.designation || ROLE_LABEL[m.role]} · {time12(m.shiftStart)} – {time12(m.shiftEnd)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{x.salary ? formatMoney(x.salary) : <span className="text-zinc-400">Not set</span>}<div className="text-[11px] text-zinc-400">{formatMoney(x.dailyRate)}/day</div></td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap justify-center gap-1">
                            <Badge tone="green">{x.full} F</Badge>
                            <Badge tone="amber">{x.half} H</Badge>
                            <Badge tone="red">{x.absent} A</Badge>
                            {x.leave > 0 && <Badge tone="blue">{x.leave} L</Badge>}
                            {x.late > 0 && <Badge>Late {x.late} · {minutesLabel(x.lateMinutes)}</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">{x.paidDays}<span className="text-zinc-400">/{x.payableDays}</span></td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(x.earned)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{row.incentive ? formatMoney(row.incentive) : <span className="text-zinc-300">—</span>}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(row.total ?? x.earned)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{formatMoney(row.paid)}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(row.balance)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="secondary" icon={CalendarDays} onClick={() => setLogsFor(m._id)}>Logs</Button>
                            {canPay && <Button size="sm" onClick={() => setPaying(row)} disabled={!x.salary && !row.incentive}>Pay</Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {payments.length > 0 && (
            <Card className="mt-6 overflow-hidden">
              <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3 text-sm font-semibold">Salary payments — {monthLabel(month + '-01')}</div>
              <ul className="divide-y divide-zinc-100">
                {payments.map((p) => (
                  <li key={p._id} className="flex items-center gap-2 px-4 py-2.5 text-sm sm:gap-4 sm:px-5">
                    <span className="w-24 shrink-0 text-xs text-zinc-500 sm:w-36 sm:text-sm">{longDay(p.paidOn)}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{p.user?.name}</span>
                    <Badge>{p.mode}</Badge>
                    {p.bank && <span className="hidden text-xs text-zinc-500 sm:inline">{p.bank.name}</span>}
                    <span className="hidden flex-1 truncate text-zinc-500 md:block">{p.note}</span>
                    <span className="shrink-0 text-right font-semibold tabular-nums sm:w-24">{formatMoney(p.amount)}</span>
                    {canPay && <button onClick={() => removePayment(p._id)} className="rounded p-1 text-zinc-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
      <PayDialog row={paying} month={month} onClose={() => setPaying(null)} onDone={load} />
      <LogsModal userId={logsFor} month={month} onClose={() => setLogsFor(null)} footer={logsRow && (
        <div className="flex justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm"><span>Paid this month <b>{formatMoney(logsRow.paid)}</b></span><span>Balance <b>{formatMoney(logsRow.balance)}</b></span></div>
      )} />
    </div>
  );
}
