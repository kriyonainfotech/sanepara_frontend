import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Banknote, Gauge, Landmark, PiggyBank, Plus, Receipt, Settings2, Target, Trash2, Wallet } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, localToday, monthLabel, shortDay } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { Field, Input, Textarea } from '../components/ui/Field';

function SettingsDialog({ open, settings, onClose, onSaved }) {
  const [heads, setHeads] = useState([]);
  const [accounts, setAccounts] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open || !settings) return;
    setHeads(settings.heads.map((h) => ({ ...h })));
    setAccounts((settings.expenseAccounts || []).join('\n'));
  }, [open, settings]);
  const total = heads.reduce((a, h) => a + (Number(h.percent) || 0), 0);
  const setHead = (i, k, v) => setHeads(heads.map((h, j) => (j === i ? { ...h, [k]: v } : h)));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/collection/settings', { heads, expenseAccounts: accounts.split('\n') });
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Collection settings" size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">Reserve heads (% of net business)</span>
            <span className={`text-xs font-semibold ${total > 100 ? 'text-red-600' : 'text-zinc-500'}`}>Total {total}%</span>
          </div>
          <div className="space-y-2">
            {heads.map((h, i) => (
              <div key={i} className="flex gap-2">
                <Input value={h.name} onChange={(e) => setHead(i, 'name', e.target.value)} placeholder="Head name" />
                <div className="relative w-28 shrink-0">
                  <Input type="number" min="0" max="100" step="any" value={h.percent} onChange={(e) => setHead(i, 'percent', e.target.value)} className="pr-7" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
                </div>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setHeads(heads.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => setHeads([...heads, { name: '', percent: 0 }])}>Add head</Button>
        </div>
        <Field label="Expense accounts" hint="One per line — shown when adding an expense.">
          <Textarea rows={5} value={accounts} onChange={(e) => setAccounts(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function GoalsDialog({ open, month, goals, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setF({ salesGoal: goals.salesGoal || '', collectionGoal: goals.collectionGoal || '' }); }, [open, goals]);
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/collection/goals', { month, ...f });
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Monthly goals" description={monthLabel(month + '-01')} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Sales goal (₹)"><Input type="number" min="0" step="any" value={f.salesGoal} onChange={(e) => setF({ ...f, salesGoal: e.target.value })} /></Field>
        <Field label="Collection goal (₹)"><Input type="number" min="0" step="any" value={f.collectionGoal} onChange={(e) => setF({ ...f, collectionGoal: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

const money = (v, cls = '') => (v ? <span className={cls}>{formatMoney(v)}</span> : <span className="text-zinc-300">—</span>);

// Card body for one day (or the month total) of the collection sheet.
function DayFigures({ d, heads, overDays }) {
  return (
    <div className="space-y-2 text-sm tabular-nums">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-zinc-50 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">Collection</div><div className="font-semibold">{money(d.collection)}</div></div>
        <div className="rounded-lg bg-zinc-50 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">Govt fee</div><div className="font-semibold text-zinc-600">{money(d.govt)}</div></div>
        <div className="rounded-lg bg-zinc-50 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">Net</div><div className="font-semibold">{money(d.net)}</div></div>
      </div>
      {heads.length > 0 && (
        <div className="space-y-0.5 text-xs">
          {heads.map((h, i) => (
            <div key={i} className="flex justify-between"><span className="text-zinc-500">{h.name} <span className="text-zinc-400">{h.percent}%</span></span>{money(d.heads[i], 'text-zinc-700')}</div>
          ))}
          <div className="flex justify-between font-semibold"><span>Saving</span>{money(d.saving, 'text-emerald-700')}</div>
        </div>
      )}
      <div className="flex justify-between gap-2 border-t border-zinc-100 pt-2 text-xs">
        <span className="text-zinc-500">Expense limit {formatMoney(d.limit)} · Spent {d.expense ? formatMoney(d.expense) : '—'}</span>
        <span className={`shrink-0 font-semibold ${d.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
          {d.remaining < 0 ? `${formatMoney(-d.remaining)} over` : `${formatMoney(d.remaining)} left`}
          {overDays ? <span className="ml-1 font-normal text-rose-500">· {overDays} day{overDays === 1 ? '' : 's'} over</span> : null}
        </span>
      </div>
    </div>
  );
}

function GoalCard({ label, actual, goal, onSet }) {
  const pct = goal ? Math.min(100, Math.round((actual / goal) * 100)) : 0;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500">{label}</span>
        {onSet && <button onClick={onSet} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">{goal ? 'Edit goal' : 'Set goal'}</button>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{formatMoney(actual)}</span>
        {goal > 0 && <span className="text-sm text-zinc-500">of {formatMoney(goal)}</span>}
      </div>
      {goal > 0 ? (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-zinc-900'}`} style={{ width: `${pct}%` }} /></div>
          <div className="mt-1.5 text-xs text-zinc-500">{pct}% achieved{actual < goal ? ` · ${formatMoney(goal - actual)} to go` : ' 🎉'}</div>
        </>
      ) : <div className="mt-3 text-xs text-zinc-400">No goal set for this month.</div>}
    </Card>
  );
}

export default function Collection() {
  const { can } = useAuth();
  const canManage = can('collection', 'manage');
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [data, setData] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const load = useCallback(() => api.get('/collection', { params: { month } }).then((r) => setData(r.data)), [month]);
  useEffect(() => { setData(null); load(); }, [load]);

  const t = data?.totals;
  const heads = data?.settings.heads || [];
  // Each day's expense limit is net business minus saving; spending more is allowed, only flagged.
  const todayRow = data?.days.find((d) => d.date === localToday());
  const overDays = t?.overDays || 0;

  return (
    <div>
      <PageHeader title="Collection" description="Date-wise collection, government fee and net business — net business split into reserves (saving). What is left after saving is that day's expense limit."
        actions={<>
          <div className="w-44"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
          {canManage && <Button variant="secondary" icon={Target} onClick={() => setGoalsOpen(true)}>Goals</Button>}
          {canManage && <Button variant="secondary" icon={Settings2} onClick={() => setSettingsOpen(true)}>Settings</Button>}
        </>} />
      {!data ? <Spinner /> : (
        <>
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <GoalCard label="Sales this month" actual={data.goals.sales} goal={data.goals.salesGoal} onSet={canManage ? () => setGoalsOpen(true) : null} />
            <GoalCard label="Collection this month" actual={data.goals.collection} goal={data.goals.collectionGoal} onSet={canManage ? () => setGoalsOpen(true) : null} />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Collection" value={formatMoney(t.collection)} icon={Banknote} tone="zinc" sub="Received on sales" />
            <StatCard label="Government fee" value={formatMoney(t.govt)} icon={Landmark} tone="violet" sub="Passed on to govt" />
            <StatCard label="Net business" value={formatMoney(t.net)} icon={Wallet} tone="blue" sub="Collection − govt fee" />
            <StatCard label="Total saving" value={formatMoney(t.saving)} icon={PiggyBank} tone="green" sub={`${heads.reduce((a, h) => a + Number(h.percent || 0), 0)}% into reserves`} />
            <StatCard
              label={todayRow ? "Today's expense limit" : 'Expense limit'}
              value={formatMoney(todayRow ? todayRow.limit : t.limit)}
              icon={Gauge}
              tone={(todayRow ? todayRow.remaining : t.remaining) < 0 ? 'rose' : 'zinc'}
              valueClass={(todayRow ? todayRow.remaining : t.remaining) < 0 ? 'text-rose-600' : ''}
              sub={(({ remaining }) => (remaining < 0 ? `${formatMoney(-remaining)} over` : `${formatMoney(remaining)} left`))(todayRow || t)}
            />
            <StatCard label="Expenses" value={formatMoney(t.expense)} icon={Receipt} tone="rose" sub={todayRow ? `Today ${formatMoney(todayRow.expense)} spent` : 'This month'} />
          </div>
          {heads.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {heads.map((h, i) => (
                <Card key={i} className="px-4 py-3">
                  <div className="text-xs text-zinc-500">{h.name} <span className="text-zinc-400">· {h.percent}%</span></div>
                  <div className="mt-0.5 font-semibold tabular-nums">{formatMoney(t.heads[i])}</div>
                </Card>
              ))}
            </div>
          )}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-5 py-3">
              <span className="text-sm font-semibold">Day-wise — {monthLabel(month + '-01')}</span>
              {can('expenses') && <Link to="/expenses" className="text-xs font-medium text-zinc-500 hover:text-zinc-900">Manage expenses →</Link>}
            </div>
            {/* Phones & tablets: month total + one card per day */}
            <div className="lg:hidden">
              {data.days.length === 0 ? <p className="py-12 text-center text-sm text-zinc-400">No days yet.</p> : (
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-900 bg-zinc-50/70 p-4 sm:col-span-2">
                    <div className="mb-2 font-semibold">Month total</div>
                    <DayFigures d={t} heads={heads} overDays={overDays} />
                  </div>
                  {data.days.map((d) => (
                    <div key={d.date} className="rounded-xl border border-zinc-200 p-4">
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="font-semibold">{shortDay(d.date)} <span className="text-xs font-normal text-zinc-400">{new Date(`${d.date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })}</span></span>
                        {d.payments > 0 && <span className="text-xs text-zinc-400">{d.payments} payment{d.payments === 1 ? '' : 's'}</span>}
                      </div>
                      <DayFigures d={d} heads={heads} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Laptop and up: table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full whitespace-nowrap text-sm">
                <thead><tr className="border-b border-zinc-100 text-right text-xs text-zinc-500">
                  <th className="px-5 py-2.5 text-left font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Collection</th><th className="px-3 py-2.5 font-medium">Govt fee</th><th className="px-3 py-2.5 font-medium">Net business</th>
                  {heads.map((h, i) => <th key={i} className="px-3 py-2.5 font-medium">{h.name}<div className="font-normal text-zinc-400">{h.percent}%</div></th>)}
                  <th className="px-3 py-2.5 font-medium">Saving</th>
                  <th className="px-3 py-2.5 font-medium">Expense limit<div className="font-normal text-zinc-400">net − saving</div></th>
                  <th className="px-3 py-2.5 font-medium">Expense</th><th className="px-5 py-2.5 font-medium">Remaining</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100 text-right tabular-nums">
                  {data.days.length === 0 ? (
                    <tr><td colSpan={8 + heads.length} className="py-12 text-center text-zinc-400">No days yet.</td></tr>
                  ) : data.days.map((d) => (
                    <tr key={d.date} className="hover:bg-zinc-50/60">
                      <td className="px-5 py-2.5 text-left font-medium">{shortDay(d.date)}<span className="ml-1.5 text-xs font-normal text-zinc-400">{new Date(`${d.date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })}</span></td>
                      <td className="px-3 py-2.5">{d.collection ? formatMoney(d.collection) : <span className="text-zinc-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-zinc-500">{d.govt ? formatMoney(d.govt) : <span className="text-zinc-300">—</span>}</td>
                      <td className="px-3 py-2.5 font-semibold">{d.net ? formatMoney(d.net) : <span className="font-normal text-zinc-300">—</span>}</td>
                      {d.heads.map((x, i) => <td key={i} className="px-3 py-2.5 text-zinc-600">{x ? formatMoney(x) : <span className="text-zinc-300">—</span>}</td>)}
                      <td className="px-3 py-2.5 text-emerald-700">{d.saving ? formatMoney(d.saving) : <span className="text-zinc-300">—</span>}</td>
                      <td className="px-3 py-2.5">{d.limit ? formatMoney(d.limit) : <span className="text-zinc-300">—</span>}</td>
                      <td className="px-3 py-2.5">{d.expense ? formatMoney(d.expense) : <span className="text-zinc-300">—</span>}</td>
                      <td className={`px-5 py-2.5 font-semibold ${!d.limit && !d.expense ? 'text-zinc-300' : d.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {!d.limit && !d.expense ? '—' : d.remaining < 0 ? `${formatMoney(-d.remaining)} over` : formatMoney(d.remaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {data.days.length > 0 && (
                  <tfoot className="border-t-2 border-zinc-200 bg-zinc-50/70 text-right font-semibold tabular-nums">
                    <tr>
                      <td className="px-5 py-3 text-left">Total</td>
                      <td className="px-3 py-3">{formatMoney(t.collection)}</td><td className="px-3 py-3">{formatMoney(t.govt)}</td><td className="px-3 py-3">{formatMoney(t.net)}</td>
                      {t.heads.map((x, i) => <td key={i} className="px-3 py-3">{formatMoney(x)}</td>)}
                      <td className="px-3 py-3 text-emerald-700">{formatMoney(t.saving)}</td>
                      <td className="px-3 py-3">{formatMoney(t.limit)}</td>
                      <td className="px-3 py-3">{formatMoney(t.expense)}</td>
                      <td className={`px-5 py-3 ${t.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {t.remaining < 0 ? `${formatMoney(-t.remaining)} over` : formatMoney(t.remaining)}
                        {overDays > 0 && <div className="text-[11px] font-normal text-rose-500">{overDays} day{overDays === 1 ? '' : 's'} over</div>}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </>
      )}
      <SettingsDialog open={settingsOpen} settings={data?.settings} onClose={() => setSettingsOpen(false)} onSaved={load} />
      <GoalsDialog open={goalsOpen} month={month} goals={data?.goals || {}} onClose={() => setGoalsOpen(false)} onSaved={load} />
    </div>
  );
}
