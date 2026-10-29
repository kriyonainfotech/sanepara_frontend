import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CalendarCheck, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, List, Pencil, Plus, Repeat, Settings2, Trash2, Undo2, Users } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { localToday, longDay, monthEndKey, monthGrid, monthLabel, monthOf, monthStartKey, shiftMonth, shortDay } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Progress from '../components/ui/Progress';
import Checkbox from '../components/ui/Checkbox';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchSelect from '../components/tasks/SearchSelect';
import { DueBadge, DueRow, styleOf } from '../components/compliance/DueRow';
import { Field, Input, Select, Textarea } from '../components/ui/Field';

const REPEAT = { none: 'One time', monthly: 'Every month', quarterly: 'Every quarter', yearly: 'Every year' };

function ItemDialog({ open, item, categories, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(item ? { title: item.title, category: item.category, dueDate: item.dueDate, repeat: item.repeat, customer: item.customer?._id || item.customer || 'all', notes: item.notes || '' } : { title: '', category: 'Trademark', dueDate: localToday(), repeat: 'none', customer: 'all', notes: '' });
    api.get('/customers/options').then((r) => setCustomers(r.data.data)).catch(() => {});
  }, [open, item]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...f, customer: f.customer === 'all' ? null : f.customer };
      const { data } = item ? await api.put(`/compliance/items/${item._id}`, body) : await api.post('/compliance/items', body);
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit due date' : 'Add due date'} description="Trademark renewals, hearings, ROC filings or anything else with a deadline." footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="due-form" loading={saving}>{item ? 'Save' : 'Add'}</Button></>
    }>
      <form id="due-form" onSubmit={submit} className="space-y-4">
        <Field label="Title" required><Input required autoFocus value={f.title || ''} onChange={set('title')} placeholder="e.g. Trademark renewal – class 25" maxLength={120} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category"><Select value={f.category} onChange={set('category')}>{categories.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Due date" required><Input type="date" value={f.dueDate} onChange={set('dueDate')} /></Field>
          <Field label="Repeats"><Select value={f.repeat} onChange={set('repeat')}>{Object.entries(REPEAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        </div>
        <Field label="Customer">
          <SearchSelect options={customers.map((c) => ({ value: c._id, label: c.businessName }))} value={f.customer} onChange={(v) => setF({ ...f, customer: v })} allLabel="No customer (firm-wide)" placeholder="Search customer…" width="w-full" />
        </Field>
        <Field label="Notes"><Textarea rows={2} value={f.notes || ''} onChange={set('notes')} placeholder="Application no., class, portal details…" /></Field>
      </form>
    </Modal>
  );
}

function DetailDialog({ o, today, canManage, onClose, onChanged, onEdit, onDelete }) {
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (o) setMoveTo(o.date); }, [o]);
  if (!o) return null;

  const run = async (fn) => {
    setBusy(true);
    try {
      const { data } = await fn();
      toast.success(data.message);
      onChanged(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const toggleDone = () => run(() => api.post('/compliance/done', { id: o.id, done: !o.done }));
  const move = (date) => run(() => api.post('/compliance/move', { id: o.id, date }));

  return (
    <Modal open onClose={onClose} title={o.title} description={[o.period, o.category].filter(Boolean).join(' · ')} footer={
      <>
        {canManage && !o.builtIn && (
          <>
            <Button variant="ghost" icon={Trash2} onClick={() => onDelete(o.item)} className="mr-auto hover:!text-red-600">Delete</Button>
            <Button variant="secondary" icon={Pencil} onClick={() => onEdit(o.item)}>Edit</Button>
          </>
        )}
        {canManage && !o.autoDone && (
          <Button variant={o.done ? 'secondary' : 'primary'} icon={o.done ? Undo2 : CheckCircle2} onClick={toggleDone} loading={busy}>{o.done ? 'Mark not done' : 'Mark done'}</Button>
        )}
      </>
    }>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{longDay(o.date)}</span>
          <DueBadge o={o} today={today} />
          {o.date !== o.original && <Badge tone="amber">Moved from {shortDay(o.original)}</Badge>}
          {o.item?.repeat && o.item.repeat !== 'none' && <Badge><Repeat className="h-3 w-3" />{REPEAT[o.item.repeat]}</Badge>}
        </div>
        {o.description && <p className="whitespace-pre-line text-zinc-600">{o.description}</p>}
        {o.customer && (
          <div className="flex items-center gap-2 text-zinc-600"><Users className="h-4 w-4 text-zinc-400" />
            <Link to={`/customers/${o.customer._id}`} className="font-medium text-zinc-900 hover:underline">{o.customer.businessName}</Link>{o.customer.phone && <span className="text-zinc-400">· {o.customer.phone}</span>}
          </div>
        )}
        {o.customers !== undefined && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Applies to {o.customers} running customer{o.customers === 1 ? '' : 's'} ({o.appliesTo.join(', ')})</span>
              <Link to="/gst-filing" className="font-medium text-zinc-700 hover:underline">Running GST Filing</Link>
            </div>
            {o.progress ? (
              <div className="mt-2">
                <div className="mb-1 text-xs text-zinc-500">Monthly GST work for {o.period}</div>
                <Progress done={o.progress.completed} total={o.progress.total} />
                {o.autoDone && <div className="mt-1 text-xs text-emerald-700">All GST work for this period is complete.</div>}
              </div>
            ) : o.workPeriod && (
              <div className="mt-1 text-xs text-zinc-400">No monthly GST work was created for {o.period}.</div>
            )}
          </div>
        )}
        {canManage && o.builtIn && (
          <div className="rounded-lg border border-dashed border-zinc-200 p-3">
            <div className="mb-2 text-xs font-medium text-zinc-600">Due date extended by the government?</div>
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="w-44!" />
              <Button size="sm" variant="secondary" disabled={!moveTo || moveTo === o.date} loading={busy} onClick={() => move(moveTo)}>Change date</Button>
              {o.date !== o.original && <Button size="sm" variant="ghost" disabled={busy} onClick={() => move(null)}>Back to {shortDay(o.original)}</Button>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CategoriesDialog({ open, categories, hidden, onClose, onSaved }) {
  const [sel, setSel] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setSel(hidden); }, [open, hidden]);
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/compliance/settings', { hiddenCategories: sel });
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Categories to show" description="Hide what the firm does not handle, e.g. TDS. Hidden categories leave the calendar and the dashboard alerts." footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>
    }>
      <div className="space-y-2.5">
        {categories.map((c) => (
          <label key={c} className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox checked={!sel.includes(c)} onChange={(on) => setSel(on ? sel.filter((x) => x !== c) : [...sel, c])} />
            <span className={`h-2 w-2 rounded-full ${styleOf(c).dot}`} />{c}
          </label>
        ))}
      </div>
    </Modal>
  );
}

function MonthCalendar({ month, today, items, selected, onSelect, onOpen }) {
  const byDay = {};
  for (const o of items) (byDay[o.date] ||= []).push(o);
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-100">
        {monthGrid(month).map((d) => {
          const list = byDay[d] || [];
          const inMonth = monthOf(d) === monthOf(month);
          const isSel = d === selected;
          return (
            <div key={d} onClick={() => onSelect(d)} className={`min-h-24 cursor-pointer p-1.5 transition-colors ${isSel ? 'bg-zinc-100 ring-1 ring-inset ring-zinc-900/20' : inMonth ? 'bg-white hover:bg-zinc-50' : 'bg-zinc-50/60 text-zinc-300 hover:bg-zinc-50'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${d === today ? 'bg-zinc-900 text-white' : inMonth ? 'text-zinc-700' : ''}`}>{Number(d.slice(8))}</span>
              <div className="mt-1 space-y-0.5">
                {list.slice(0, 3).map((o) => {
                  const late = !o.done && o.date < today;
                  return (
                    <button key={o.id} onClick={(e) => { e.stopPropagation(); onOpen(o); }} title={o.title}
                      className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium sm:text-[11px] ${o.done ? 'bg-zinc-100 text-zinc-400 line-through' : late ? 'bg-red-50 text-red-700' : styleOf(o.category).chip}`}>
                      {o.title}
                    </button>
                  );
                })}
                {list.length > 3 && <div className="px-1 text-[10px] font-medium text-zinc-500">+{list.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Compliance() {
  const { can } = useAuth();
  const canManage = can('compliance', 'manage');
  const today = localToday();
  const [month, setMonth] = useState(monthStartKey(today));
  const [view, setView] = useState('calendar');
  const [category, setCategory] = useState('');
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [selected, setSelected] = useState(today);
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [catsOpen, setCatsOpen] = useState(false);

  const load = useCallback(() => {
    const grid = monthGrid(month);
    api.get('/compliance', { params: { from: grid[0], to: grid.at(-1) } }).then((r) => setData(r.data)).catch((e) => toast.error(errorMessage(e)));
    api.get('/compliance/upcoming').then((r) => setAlerts(r.data)).catch(() => {});
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => (data?.data || []).filter((o) => !category || o.category === category), [data, category]);
  const inMonth = items.filter((o) => o.date >= month && o.date <= monthEndKey(month));
  const dayItems = items.filter((o) => o.date === selected);
  const shownCategories = (data?.categories || []).filter((c) => !data.hiddenCategories.includes(c));

  const remove = async () => {
    try {
      await api.delete(`/compliance/items/${deleting._id}`);
      toast.success('Due date deleted');
      setDeleting(null); load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const goMonth = (m) => { setMonth(m); setSelected(m === monthStartKey(today) ? today : m); };

  return (
    <div>
      <PageHeader title="Compliance Calendar" description="GST, income tax, TDS and trademark due dates. Overdue and coming-up dates also show on the dashboard."
        actions={canManage && (
          <>
            <Button variant="secondary" icon={Settings2} onClick={() => setCatsOpen(true)}>Categories</Button>
            <Button icon={Plus} onClick={() => setEditing(null)}>Add due date</Button>
          </>
        )} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Overdue (last 30 days)" value={alerts ? alerts.overdue.length : '—'} icon={AlertTriangle} tone="rose" />
        <StatCard label="Due in next 7 days" value={alerts ? alerts.upcoming.length : '—'} icon={CalendarClock} tone="amber" />
        <StatCard label={`Due in ${monthLabel(month, { month: 'long' })}`} value={data ? inMonth.length : '—'} icon={CalendarDays} tone="blue" />
        <StatCard label="Done" value={data ? inMonth.filter((o) => o.done).length : '—'} icon={CheckCircle2} tone="green" sub={data && `of ${inMonth.length} this month`} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs value={view} onChange={setView} items={[{ key: 'calendar', label: 'Calendar', icon: CalendarDays }, { key: 'list', label: 'List', icon: List }]} />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto!">
          <option value="">All categories</option>
          {shownCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="secondary" size="icon" onClick={() => goMonth(shiftMonth(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-32 text-center text-sm font-semibold">{monthLabel(month)}</span>
          <Button variant="secondary" size="icon" onClick={() => goMonth(shiftMonth(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
          {month !== monthStartKey(today) && <Button variant="ghost" size="sm" onClick={() => goMonth(monthStartKey(today))}>Today</Button>}
        </div>
      </div>

      {!data ? <Card><Spinner /></Card> : view === 'calendar' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="overflow-hidden xl:col-span-2">
            <MonthCalendar month={month} today={today} items={items} selected={selected} onSelect={setSelected} onOpen={setOpen} />
          </Card>
          <Card className="self-start overflow-hidden">
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold">{longDay(selected)}</div>
            {dayItems.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-zinc-400">Nothing due on this day.</div>
            ) : (
              <div className="divide-y divide-zinc-100">{dayItems.map((o) => <DueRow key={o.id} o={o} today={today} onOpen={setOpen} showDate={false} />)}</div>
            )}
          </Card>
        </div>
      ) : (
        <Card className="overflow-hidden">
          {inMonth.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Nothing due this month" message={category ? 'Try another category.' : 'Add your own due dates like trademark renewals.'} />
          ) : (
            Object.entries(inMonth.reduce((g, o) => ({ ...g, [o.date]: [...(g[o.date] || []), o] }), {})).map(([d, list]) => (
              <div key={d}>
                <div className={`border-y border-zinc-100 bg-zinc-50/70 px-4 py-1.5 text-xs font-semibold ${d === today ? 'text-zinc-900' : 'text-zinc-500'}`}>{longDay(d)}{d === today && ' · Today'}</div>
                <div className="divide-y divide-zinc-100">{list.map((o) => <DueRow key={o.id} o={o} today={today} onOpen={setOpen} showDate={false} />)}</div>
              </div>
            ))
          )}
        </Card>
      )}

      <DetailDialog o={open} today={today} canManage={canManage} onClose={() => setOpen(null)} onChanged={load}
        onEdit={(item) => { setOpen(null); setEditing(item); }} onDelete={(item) => { setOpen(null); setDeleting(item); }} />
      <ItemDialog open={editing !== undefined} item={editing} categories={data?.categories || []} onClose={() => setEditing(undefined)} onSaved={load} />
      <CategoriesDialog open={catsOpen} categories={data?.categories || []} hidden={data?.hiddenCategories || []} onClose={() => setCatsOpen(false)} onSaved={load} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete due date?" message={`“${deleting?.title}” and all its repeats will be removed from the calendar.`} />
    </div>
  );
}
