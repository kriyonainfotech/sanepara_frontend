import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarCog, FileCheck2, History, Pause, Pencil, Play, Plus, Search, Settings2, Trash2, WandSparkles } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { localToday, longDay } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SearchSelect from '../components/tasks/SearchSelect';
import Progress from '../components/ui/Progress';
import Checkbox from '../components/ui/Checkbox';
import { Field, Input, Select, Textarea } from '../components/ui/Field';

const RETURN_TYPES = ['Monthly', 'Quarterly (QRMP)', 'Composition'];
const ACTION_TONE = { Started: 'blue', Stopped: 'red', Resumed: 'green' };

function FilingDialog({ open, filing, existing, onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(filing ? { returnType: filing.returnType, notes: filing.notes || '' } : { customer: 'all', returnType: 'Monthly', startedOn: localToday(), notes: '' });
    if (!filing) api.get('/customers/options').then((r) => setCustomers(r.data.data));
  }, [open, filing]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!filing && f.customer === 'all') return toast.error('Select a customer');
    setSaving(true);
    try {
      const { data } = filing ? await api.put(`/gst-filing/${filing._id}`, f) : await api.post('/gst-filing', f);
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const options = customers.filter((c) => !existing.has(c._id)).map((c) => ({ value: c._id, label: c.businessName }));

  return (
    <Modal open={open} onClose={onClose} title={filing ? 'Edit GST Filing' : 'Start GST Filing'} description={filing?.customer?.businessName} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="gst-form" loading={saving}>{filing ? 'Save' : 'Start Filing'}</Button></>
    }>
      <form id="gst-form" onSubmit={submit} className="space-y-4">
        {!filing && (
          <Field label="Customer" required>
            <SearchSelect options={options} value={f.customer} onChange={(v) => setF({ ...f, customer: v })} allLabel="Select customer" placeholder="Search customer…" width="w-full" />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Return type"><Select value={f.returnType} onChange={set('returnType')}>{RETURN_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          {!filing && <Field label="Filing from"><Input type="date" value={f.startedOn} onChange={set('startedOn')} /></Field>}
        </div>
        <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={set('notes')} placeholder="Login / portal notes, special instructions…" /></Field>
      </form>
    </Modal>
  );
}

function ToggleDialog({ filing, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [date, setDate] = useState(localToday());
  const [saving, setSaving] = useState(false);
  useEffect(() => { setNote(''); setDate(localToday()); }, [filing]);
  const stopping = filing?.isRunning;
  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/gst-filing/${filing._id}/${stopping ? 'stop' : 'resume'}`, { note, date });
      toast.success(data.message);
      onDone(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={!!filing} onClose={onClose} size="sm" title={stopping ? 'Stop GST Filing' : 'Resume GST Filing'} description={filing?.customer?.businessName} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={stopping ? 'danger' : 'primary'} onClick={submit} loading={saving}>{stopping ? 'Stop Filing' : 'Resume Filing'}</Button></>
    }>
      <div className="space-y-4">
        <Field label={stopping ? 'Stopped from' : 'Resumed from'}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Reason / note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={stopping ? 'e.g. Business closed, moved to other CA…' : 'Optional'} /></Field>
        {stopping && <p className="text-xs text-zinc-500">Stopped customers drop off the monthly bill reminders until resumed.</p>}
      </div>
    </Modal>
  );
}

function HistoryDialog({ filing, onClose }) {
  return (
    <Modal open={!!filing} onClose={onClose} title="Filing history" description={filing?.customer?.businessName}>
      <ol className="space-y-3">
        {[...(filing?.history || [])].reverse().map((h) => (
          <li key={h._id} className="flex gap-3 text-sm">
            <Badge tone={ACTION_TONE[h.action]} className="h-fit w-20 justify-center">{h.action}</Badge>
            <div className="flex-1">
              <div className="font-medium">{longDay(h.date)}</div>
              <div className="text-xs text-zinc-500">{h.by?.name ? `by ${h.by.name}` : ''}{h.note ? ` · ${h.note}` : ''}</div>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}

const nth = (n) => `${n}${[, 'st', 'nd', 'rd'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10] || 'th'}`;
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

function WorkSettingsDialog({ open, settings, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [services, setServices] = useState([]);
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF({ ...settings });
    api.get('/services', { params: { active: true } }).then((r) => setServices(r.data.services)).catch(() => {});
    api.get('/users', { params: { active: true } }).then((r) => setMembers(r.data.users)).catch(() => {});
  }, [open, settings]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const service = services.find((s) => s._id === f.serviceId);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/gst-filing/work', f);
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Monthly GST work" description="Create the GST service for every running customer automatically, every month." footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>
    }>
      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3">
          <Checkbox checked={!!f.enabled} onChange={(v) => setF({ ...f, enabled: v })} className="mt-0.5" />
          <span className="text-sm"><span className="font-medium">Create GST work automatically</span>
            <span className="block text-xs text-zinc-500">Monthly filers get last month’s work every month. QRMP and Composition filers get last quarter’s work in Jan, Apr, Jul and Oct.</span></span>
        </label>
        <Field label="GST service to create" required hint={service ? `${service.tasks.length} tasks: ${service.tasks.map((t) => t.title).join(', ')}` : 'Its task list becomes the work for each customer.'}>
          <Select value={f.serviceId || ''} onChange={set('serviceId')}>
            <option value="">Select a service…</option>
            {services.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Create on">
          <Select value={String(f.createOnDay || 1)} onChange={set('createOnDay')}>{DAYS.map((d) => <option key={d} value={String(d)}>{nth(d)} of every month</option>)}</Select>
        </Field>
        <div className={f.assignTo ? 'grid gap-4 sm:grid-cols-2' : ''}>
          <Field label="Give the tasks to">
            <Select value={f.assignTo || ''} onChange={set('assignTo')}>
              <option value="">Nobody — wait in Schedule Management</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </Select>
          </Field>
          {f.assignTo && (
            <Field label="Tasks due on">
              <Select value={String(f.dueDay || 10)} onChange={set('dueDay')}>{DAYS.map((d) => <option key={d} value={String(d)}>{nth(d)} of the month</option>)}</Select>
            </Field>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Settings summary and progress of the current month's / quarter's GST work.
function WorkCard({ canManage, onChanged }) {
  const [work, setWork] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const load = useCallback(() => {
    api.get('/gst-filing/work').then((r) => {
      setWork(r.data);
      const id = r.data.settings.serviceId;
      if (id) api.get('/services').then((s) => setServiceName(s.data.services.find((x) => x._id === id)?.name || '')).catch(() => {});
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!work) return null;
  const s = work.settings;

  const runNow = async () => {
    setRunning(true);
    try {
      const { data } = await api.post('/gst-filing/work/run');
      toast.success(data.message, { duration: 6000 });
      load(); onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="mb-5 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CalendarCog className="h-4 w-4" /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">Monthly GST work {s.enabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}</div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {s.enabled
                ? <>On the {nth(s.createOnDay)} of every month each running customer gets <b className="text-zinc-700">{serviceName || 'the GST service'}</b> for last month (quarterly filers: last quarter). {s.assignTo ? <>Tasks go straight to the chosen member, due on the {nth(s.dueDay)}.</> : 'It waits in Schedule Management to be given to a member.'}</>
                : 'Switch on to create the GST service for every running customer automatically each month.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 lg:w-80">
          {work.periods.map((p) => (
            <div key={p.period} className="min-w-32 flex-1">
              <div className="text-[11px] font-medium text-zinc-500">{p.label} · {p.quarterly ? 'quarterly' : 'monthly'}</div>
              {p.total ? <Progress done={p.completed} total={p.total} className="mt-1" /> : <div className="mt-1 text-xs text-zinc-400">No work created</div>}
            </div>
          ))}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={Settings2} onClick={() => setEditing(true)}>Settings</Button>
            <Button size="sm" variant="secondary" icon={WandSparkles} onClick={runNow} loading={running} disabled={!s.serviceId} title={s.serviceId ? 'Create this period’s work now' : 'Choose the GST service in Settings first'}>Create now</Button>
          </div>
        )}
      </div>
      <WorkSettingsDialog open={editing} settings={s} onClose={() => setEditing(false)} onSaved={load} />
    </Card>
  );
}

export default function GstFiling() {
  const { can } = useAuth();
  const canManage = can('gst_filing', 'manage');
  const [status, setStatus] = useState('running');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [allIds, setAllIds] = useState(new Set());
  const [editing, setEditing] = useState(undefined);
  const [toggling, setToggling] = useState(null);
  const [history, setHistory] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t); }, [search]);
  const load = useCallback(() => {
    api.get('/gst-filing', { params: { status, ...(q && { search: q }) } }).then((r) => setData(r.data)).catch((e) => { toast.error(errorMessage(e)); setData({ data: [], stats: null }); });
    api.get('/gst-filing').then((r) => setAllIds(new Set(r.data.data.map((x) => x.customer?._id)))).catch(() => {});
  }, [status, q]);
  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    try {
      await api.delete(`/gst-filing/${deleting._id}`);
      toast.success('Removed');
      setDeleting(null); load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const s = data?.stats;
  return (
    <div>
      <PageHeader title="Running GST Filing" description="Customers whose GST filing the firm is doing right now. Stop or resume filing any time."
        actions={canManage && <Button icon={Plus} onClick={() => setEditing(null)}>Add Customer</Button>} />
      {s && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Running" value={s.running} icon={Play} tone="green" />
          <StatCard label="Stopped" value={s.stopped} icon={Pause} tone="rose" />
          {RETURN_TYPES.map((t) => <StatCard key={t} label={t} value={s.byType[t] || 0} icon={FileCheck2} tone="blue" sub="Running" />)}
        </div>
      )}
      <WorkCard canManage={canManage} onChanged={load} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs value={status} onChange={setStatus} items={[{ key: 'running', label: 'Running', count: s?.running }, { key: 'stopped', label: 'Stopped', count: s?.stopped }, { key: 'all', label: 'All' }]} />
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, GSTIN, mobile…" className="pl-9" />
        </div>
      </div>
      <Card className="overflow-hidden">
        {!data ? <Spinner /> : data.data.length === 0 ? (
          <EmptyState icon={FileCheck2} title={status === 'stopped' ? 'No stopped filings' : 'No customers here yet'} message="Add customers whose GST return you file every month / quarter."
            action={canManage && status !== 'stopped' && <Button icon={Plus} onClick={() => setEditing(null)}>Add Customer</Button>} />
        ) : (
          <>
          {/* Phones & tablets: cards */}
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {data.data.map((g) => (
              <div key={g._id} className="flex flex-col rounded-xl border border-zinc-200 p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={g.customer?.businessName} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{g.customer?.businessName}</div>
                    <div className="text-xs text-zinc-500">{[g.customer?.contactPerson, g.customer?.phone].filter(Boolean).join(' · ')}</div>
                  </div>
                  {g.isRunning ? <Badge tone="green">Running</Badge> : <Badge tone="red">Stopped</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge>{g.returnType}</Badge>
                  <span className="font-mono">{g.customer?.gstNumber || <span className="font-sans text-zinc-400">GSTIN not added</span>}</span>
                </div>
                <div className="mt-1.5 text-[11px] text-zinc-400">{g.isRunning ? `Running since ${longDay(g.history.at(-1)?.date || g.startedOn)}` : `Stopped from ${longDay(g.stoppedOn)}`}</div>
                {g.notes && <div className="mt-1.5 line-clamp-2 text-xs text-zinc-500">{g.notes}</div>}
                <div className="mt-auto flex flex-wrap justify-end gap-1 pt-3">
                  <Button size="icon" variant="ghost" title="History" onClick={() => setHistory(g)}><History className="h-4 w-4" /></Button>
                  {canManage && (
                    <>
                      <Button size="sm" variant={g.isRunning ? 'secondary' : 'primary'} icon={g.isRunning ? Pause : Play} onClick={() => setToggling(g)}>{g.isRunning ? 'Stop' : 'Resume'}</Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(g)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(g)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Laptop and up: table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                <th className="px-5 py-2.5 font-medium">Customer</th><th className="px-3 py-2.5 font-medium">GSTIN</th><th className="px-3 py-2.5 font-medium">Return</th>
                <th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 font-medium">Notes</th><th className="px-5 py-2.5" />
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {data.data.map((g) => (
                  <tr key={g._id} className="hover:bg-zinc-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={g.customer?.businessName} />
                        <div><div className="font-medium">{g.customer?.businessName}</div><div className="text-xs text-zinc-500">{[g.customer?.contactPerson, g.customer?.phone].filter(Boolean).join(' · ')}</div></div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{g.customer?.gstNumber || <span className="font-sans text-zinc-400">Not added</span>}</td>
                    <td className="px-3 py-3"><Badge>{g.returnType}</Badge></td>
                    <td className="px-3 py-3">
                      {g.isRunning ? <Badge tone="green">Running</Badge> : <Badge tone="red">Stopped</Badge>}
                      <div className="mt-0.5 text-[11px] text-zinc-400">{g.isRunning ? `since ${longDay(g.history.at(-1)?.date || g.startedOn)}` : `from ${longDay(g.stoppedOn)}`}</div>
                    </td>
                    <td className="max-w-56 truncate px-3 py-3 text-xs text-zinc-500">{g.notes}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="History" onClick={() => setHistory(g)}><History className="h-4 w-4" /></Button>
                        {canManage && (
                          <>
                            <Button size="sm" variant={g.isRunning ? 'secondary' : 'primary'} icon={g.isRunning ? Pause : Play} onClick={() => setToggling(g)}>{g.isRunning ? 'Stop' : 'Resume'}</Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditing(g)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleting(g)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
      <FilingDialog open={editing !== undefined} filing={editing} existing={allIds} onClose={() => setEditing(undefined)} onSaved={load} />
      <ToggleDialog filing={toggling} onClose={() => setToggling(null)} onDone={load} />
      <HistoryDialog filing={history} onClose={() => setHistory(null)} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Remove from list?" message={`${deleting?.customer?.businessName} and its filing history will be removed. To pause filing, use Stop instead.`} confirmText="Remove" />
    </div>
  );
}
