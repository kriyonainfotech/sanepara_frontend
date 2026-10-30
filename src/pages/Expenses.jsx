import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarCheck, CalendarRange, Hash, Pencil, Plus, Receipt, Trash2, TriangleAlert, Wallet } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, localToday, longDay, monthLabel } from '../lib/format';
import { PAY_MODES } from '../lib/sales';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, Input, Select } from '../components/ui/Field';
import BankSelect from '../components/BankSelect';

function ExpenseDialog({ open, expense, accounts, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [day, setDay] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setF(expense ? { date: expense.date, account: expense.account, amount: expense.amount, mode: expense.mode, bank: expense.bank?._id || expense.bank || '', paidTo: expense.paidTo || '', note: expense.note || '' } : { date: localToday(), account: accounts[0] || '', amount: '', mode: 'Cash', bank: '', paidTo: '', note: '' });
  }, [open, expense, accounts]);
  // Limit and spending of the picked date (any date, not just today).
  useEffect(() => {
    setDay(null);
    if (!open || !f.date) return;
    let live = true;
    api.get('/expenses/day', { params: { date: f.date } }).then((r) => live && setDay(r.data.data)).catch(() => {});
    return () => { live = false; };
  }, [open, f.date]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  // Warn (but still allow) when this entry takes that day's spending past the limit.
  const over = day && day.date === f.date && Number(f.amount) > 0
    ? day.spent - (expense?.date === f.date ? expense.amount : 0) + Number(f.amount) - day.limit
    : 0;
  const isToday = f.date === localToday();
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Reuse the existing spelling of an account typed in different case.
      const account = accounts.find((a) => a.toLowerCase() === String(f.account).trim().toLowerCase()) || f.account;
      const payload = { ...f, account };
      const { data } = expense ? await api.put(`/expenses/${expense._id}`, payload) : await api.post('/expenses', payload);
      if (data.day?.remaining < 0) toast(data.message, { icon: '⚠️' });
      else toast.success(data.message);
      onSaved(data.data?.date); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={expense ? 'Edit Expense' : 'Add Expense'} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="expense-form" loading={saving}>{expense ? 'Save' : 'Add Expense'}</Button></>
    }>
      <form id="expense-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (₹)" required>
          {/* Number inputs accept e / + / - (scientific notation); an amount never needs them. */}
          <Input type="number" min="0.01" step="any" required autoFocus value={f.amount} onChange={set('amount')} onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()} />
        </Field>
        <Field label="Date" required><Input type="date" required max={localToday()} value={f.date} onChange={set('date')} /></Field>
        <Field label="Account" required>
          <Input list="expense-accounts" required maxLength={50} value={f.account} onChange={set('account')} placeholder="e.g. Office" />
          <datalist id="expense-accounts">{accounts.map((a) => <option key={a} value={a} />)}</datalist>
        </Field>
        <Field label="Mode"><Select value={f.mode} onChange={set('mode')}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <BankSelect label="Paid from" value={f.bank} onChange={(v) => setF({ ...f, bank: v })} />
        <Field label="Paid to"><Input maxLength={100} value={f.paidTo} onChange={set('paidTo')} /></Field>
        <Field label="Note"><Input maxLength={300} value={f.note} onChange={set('note')} /></Field>
        {over > 0 && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This goes {formatMoney(over)} over {isToday ? "today's" : `${longDay(f.date)}'s`} expense limit of {formatMoney(day.limit)}. You can still save it.</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default function Expenses() {
  const { can } = useAuth();
  // Period shown: today, a month, a year or a date range.
  const [period, setPeriod] = useState('month');
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [range, setRange] = useState({ from: `${localToday().slice(0, 7)}-01`, to: localToday() });
  const [account, setAccount] = useState('');
  const [data, setData] = useState(null);
  const [year, setYear] = useState(localToday().slice(0, 4));
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);

  const params = period === 'today' ? { from: localToday(), to: localToday() }
    : period === 'year' ? { year }
    : period === 'range' ? (range.from && range.to ? range : null)
    : { month };
  const paramsKey = JSON.stringify(params);
  const load = useCallback(() => {
    if (params) api.get('/expenses', { params }).then((r) => setData(r.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);
  useEffect(() => { load(); }, [load]);
  const years = Array.from({ length: 5 }, (_, i) => String(Number(localToday().slice(0, 4)) - i));

  // An expense saved on a date in another month: jump to that month so it is visible.
  const onSaved = (date) => {
    if (period === 'month' && date && date.slice(0, 7) !== month) setMonth(date.slice(0, 7));
    else load();
  };

  const periodTitle = period === 'today' ? 'Today'
    : period === 'year' ? `Year ${year}`
    : period === 'range' ? (data ? `${longDay(data.from)} – ${longDay(data.to)}` : 'Date range')
    : monthLabel(month);

  const remove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/expenses/${deleting._id}`);
      toast.success('Expense deleted');
      setDeleting(null); load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRemoving(false);
    }
  };

  const today = data?.today;
  const top = Object.entries(data?.stats.byAccount || {}).sort((a, b) => b[1] - a[1]);
  const rows = (data?.data || []).filter((e) => !account || e.account === account);
  const rowsTotal = rows.reduce((a, e) => a + e.amount, 0);
  const chip = (on) => `rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${on ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`;

  return (
    <div>
      <PageHeader title="Expenses" description="Office expenses by account. Each day's expense limit is what is left of net business after saving (see Collection)."
        actions={<>
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5">
            {[['today', 'Today'], ['month', 'Month'], ['year', 'Year'], ['range', 'Date range']].map(([k, label]) => (
              <button key={k} onClick={() => setPeriod(k)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${period === k ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>{label}</button>
            ))}
          </div>
          {period === 'month' && <div className="w-44"><Input type="month" value={month} max={localToday().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>}
          {period === 'year' && <div className="w-28"><Select value={year} onChange={(e) => setYear(e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</Select></div>}
          {period === 'range' && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Input type="date" value={range.from} max={range.to || localToday()} onChange={(e) => setRange({ ...range, from: e.target.value })} className="w-auto!" />
              <span>to</span>
              <Input type="date" value={range.to} min={range.from || undefined} max={localToday()} onChange={(e) => setRange({ ...range, to: e.target.value })} className="w-auto!" />
            </div>
          )}
          {can('expenses', 'create') && <Button icon={Plus} onClick={() => setEditing(null)}>Add Expense</Button>}
        </>} />
      {!data ? <Spinner /> : (
        <>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">{periodTitle}</div>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Expenses" value={data.period.count} icon={Hash} tone="zinc" sub={`entr${data.period.count === 1 ? 'y' : 'ies'}`} />
            <StatCard label="Limit" value={formatMoney(data.period.limit)} icon={CalendarRange} tone="zinc" sub="Net business − saving" />
            <StatCard label="Spent" value={formatMoney(data.period.spent)} icon={Receipt} tone="rose" />
            <StatCard label="Remaining" value={formatMoney(data.period.remaining)} icon={Wallet} tone={data.period.remaining < 0 ? 'rose' : 'green'}
              valueClass={data.period.remaining < 0 ? 'text-rose-600' : ''} sub={data.period.remaining < 0 ? 'Over the limit (allowed)' : undefined} />
          </div>
          {period !== 'today' && <>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Today</div>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Today's limit" value={formatMoney(today.limit)} icon={CalendarCheck} tone="zinc" sub="Net business − saving" />
            <StatCard label="Spent today" value={formatMoney(today.spent)} icon={Wallet} tone="amber" />
            <StatCard label="Remaining today" value={formatMoney(today.remaining)} icon={Wallet} tone={today.remaining < 0 ? 'rose' : 'green'}
              valueClass={today.remaining < 0 ? 'text-rose-600' : ''} sub={today.remaining < 0 ? 'Over the limit (allowed)' : undefined} />
          </div>
          </>}
          <Card className="overflow-hidden">
            {/* Which entries: the period picked at the top + an optional category. */}
            <div className="border-b border-zinc-100 px-5 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">Expense entries <span className="font-normal text-zinc-500">· {periodTitle}{account ? ` · ${account}` : ''}</span></h2>
                <div className="text-sm text-zinc-500">{rows.length} {rows.length === 1 ? 'entry' : 'entries'} · <span className="font-semibold tabular-nums text-zinc-900">{formatMoney(rowsTotal)}</span></div>
              </div>
              {top.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => setAccount('')} className={chip(!account)}>All</button>
                  {top.map(([a, amt]) => (
                    <button key={a} onClick={() => setAccount(a === account ? '' : a)} className={chip(account === a)}>{a} <span className="opacity-60">{formatMoney(amt)}</span></button>
                  ))}
                </div>
              )}
            </div>
            {rows.length === 0 ? (
              <EmptyState icon={Receipt} title="No expenses" message="Expenses you add show up here and in the Collection sheet." action={can('expenses', 'create') && <Button icon={Plus} onClick={() => setEditing(null)}>Add Expense</Button>} />
            ) : (
              <>
              {/* Phones & tablets: cards */}
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
                {rows.map((e) => (
                  <div key={e._id} className="flex flex-col rounded-xl border border-zinc-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{e.paidTo || e.account}</div>
                        <div className="text-xs text-zinc-500">{longDay(e.date)}</div>
                      </div>
                      <span className="shrink-0 text-lg font-semibold tabular-nums">{formatMoney(e.amount)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5"><Badge tone="violet">{e.account}</Badge><Badge>{e.mode}</Badge>{e.bank && <Badge tone="blue">{e.bank.name}</Badge>}</div>
                    {(e.note || e.createdBy?.name) && <div className="mt-2 text-xs text-zinc-500">{e.note}{e.createdBy?.name ? `${e.note ? ' · ' : ''}by ${e.createdBy.name}` : ''}</div>}
                    {(can('expenses', 'edit') || can('expenses', 'delete')) && (
                      <div className="mt-auto flex justify-end gap-1 pt-2">
                        {can('expenses', 'edit') && <Button size="icon" variant="ghost" onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></Button>}
                        {can('expenses', 'delete') && <Button size="icon" variant="ghost" onClick={() => setDeleting(e)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Laptop and up: table */}
              <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Paid to</th>
                  <th className="px-3 py-2.5 font-medium">Paid from</th>
                  <th className="px-3 py-2.5 font-medium">Mode</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="w-24 px-5 py-2.5" />
                </tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((e) => (
                    <tr key={e._id} className="group hover:bg-zinc-50/60">
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-600">{longDay(e.date)}</td>
                      <td className="px-3 py-3"><Badge tone="violet">{e.account}</Badge></td>
                      <td className="max-w-xs px-3 py-3">
                        <div className="truncate">{e.paidTo || <span className="text-zinc-400">—</span>}</div>
                        {(e.note || e.createdBy?.name) && <div className="truncate text-xs text-zinc-400">{[e.note, e.createdBy?.name && `by ${e.createdBy.name}`].filter(Boolean).join(' · ')}</div>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-zinc-600">{e.bank?.name || <span className="text-zinc-400">—</span>}</td>
                      <td className="px-3 py-3"><Badge>{e.mode}</Badge></td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(e.amount)}</td>
                      <td className="px-5 py-1.5">
                        <div className="flex justify-end gap-0.5 opacity-60 transition group-hover:opacity-100">
                          {can('expenses', 'edit') && <Button size="icon" variant="ghost" onClick={() => setEditing(e)}><Pencil className="h-3.5 w-3.5" /></Button>}
                          {can('expenses', 'delete') && <Button size="icon" variant="ghost" onClick={() => setDeleting(e)} className="hover:!text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-zinc-200 bg-zinc-50/70 font-semibold">
                  <td className="px-5 py-3" colSpan={5}>Total · {rows.length} {rows.length === 1 ? 'entry' : 'entries'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatMoney(rowsTotal)}</td>
                  <td />
                </tr></tfoot>
              </table></div>
              </>
            )}
          </Card>
        </>
      )}
      <ExpenseDialog open={editing !== undefined} expense={editing} accounts={data?.accounts || []} onClose={() => setEditing(undefined)} onSaved={onSaved} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={removing} title="Delete expense?" message={deleting && `${formatMoney(deleting.amount)} · ${deleting.account} on ${longDay(deleting.date)} will be deleted.`} />
    </div>
  );
}
