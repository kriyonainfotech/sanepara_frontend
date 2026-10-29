import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, Gift, Plus, RotateCcw, Settings2, Share2, Trash2, XCircle } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, localToday, monthLabel, ROLE_LABEL, shortDay } from '../lib/format';
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
import SearchSelect from '../components/tasks/SearchSelect';
import { Field, Input, Select, Textarea } from '../components/ui/Field';

const STATUS_TONE = { Pending: 'amber', Converted: 'green', Rejected: 'zinc' };
const STATUS_LABEL = { Pending: 'Pending', Converted: 'Converted', Rejected: 'Not converted' };

function ReferDialog({ open, canPickMember, onClose, onSaved }) {
  const [opts, setOpts] = useState({ customers: [], services: [] });
  const [members, setMembers] = useState([]);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF({ customer: 'all', service: '', note: '', referredBy: '' });
    api.get('/referrals/options').then((r) => setOpts(r.data));
    if (canPickMember) api.get('/users', { params: { active: 'true' } }).then((r) => setMembers(r.data.users));
  }, [open, canPickMember]);

  const submit = async (e) => {
    e.preventDefault();
    if (f.customer === 'all') return toast.error('Select a customer');
    setSaving(true);
    try {
      const { data } = await api.post('/referrals', { ...f, referredBy: f.referredBy || undefined });
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Refer a Service" description="Suggest a service to a customer. When it is sold, you earn the incentive." footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="refer-form" loading={saving}>Refer</Button></>
    }>
      <form id="refer-form" onSubmit={submit} className="space-y-4">
        <Field label="Customer" required>
          <SearchSelect options={opts.customers.map((c) => ({ value: c._id, label: c.businessName }))} value={f.customer} onChange={(v) => setF({ ...f, customer: v })} allLabel="Select customer" placeholder="Search customer…" width="w-full" />
        </Field>
        <Field label="Service" required>
          <Select required value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })}>
            <option value="">Select service</option>
            {opts.services.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        </Field>
        {canPickMember && (
          <Field label="Referred by" hint="Leave empty for yourself">
            <Select value={f.referredBy} onChange={(e) => setF({ ...f, referredBy: e.target.value })}>
              <option value="">Me</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Note"><Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="What the customer needs, when to call…" /></Field>
      </form>
    </Modal>
  );
}

function ConvertDialog({ referral, onClose, onDone }) {
  const [info, setInfo] = useState(null);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!referral) return;
    setInfo(null);
    api.get(`/referrals/${referral._id}/suggest`).then((r) => {
      setInfo(r.data);
      const match = r.data.sales.find((s) => s.service === referral.service?._id);
      setF({ sale: match?._id || '', incentive: '', convertedOn: '' });
      if (match) api.get(`/referrals/${referral._id}/suggest`, { params: { sale: match._id } }).then((x) => setInfo(x.data));
    });
  }, [referral]);

  const pickSale = (sale) => {
    setF({ ...f, sale, incentive: '' });
    api.get(`/referrals/${referral._id}/suggest`, { params: sale ? { sale } : {} }).then((r) => setInfo(r.data));
  };
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post(`/referrals/${referral._id}/convert`, { ...f, incentive: f.incentive === '' ? info.incentive : f.incentive });
      toast.success(data.message);
      onDone(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={!!referral} onClose={onClose} title="Mark as Converted" description={referral && `${referral.service?.name} → ${referral.customer?.businessName} · by ${referral.referredBy?.name}`} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="convert-form" loading={saving} disabled={!info}>Convert</Button></>
    }>
      {!info ? <Spinner /> : (
        <form id="convert-form" onSubmit={submit} className="space-y-4">
          <Field label="Linked sale" hint="The incentive counts in the month of the sale date">
            <Select value={f.sale} onChange={(e) => pickSale(e.target.value)}>
              <option value="">No sale linked</option>
              {info.sales.map((s) => <option key={s._id} value={s._id}>{s.saleNo} · {shortDay(s.saleDate)} · {s.title} · {formatMoney(s.professionalFee)}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Incentive (₹)" hint={info.basis}><Input type="number" min="0" step="any" value={f.incentive === '' ? info.incentive : f.incentive} onChange={(e) => setF({ ...f, incentive: e.target.value })} /></Field>
            {!f.sale && <Field label="Converted on" hint="Default today"><Input type="date" value={f.convertedOn} onChange={(e) => setF({ ...f, convertedOn: e.target.value })} /></Field>}
          </div>
        </form>
      )}
    </Modal>
  );
}

const TypeSelect = ({ value, onChange }) => (
  <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-24 shrink-0"><option value="percent">%</option><option value="fixed">₹ fixed</option></Select>
);

function RulesDialog({ open, onClose }) {
  const [rules, setRules] = useState(null);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    api.get('/referrals/settings').then((r) => setRules(r.data.data));
    api.get('/referrals/options').then((r) => setServices(r.data.services));
  }, [open]);
  const ruleFor = (id) => rules.services.find((s) => s.service === id);
  const setRule = (id, patch) => {
    const rest = rules.services.filter((s) => s.service !== id);
    const cur = ruleFor(id) || { service: id, type: 'percent', value: '' };
    setRules({ ...rules, services: [...rest, { ...cur, ...patch }] });
  };
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/referrals/settings', { ...rules, services: rules.services.filter((x) => x.value !== '' && x.value != null) });
      toast.success(data.message);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Incentive rules" description="% is of the sale's professional fee. A service's own rule overrides the default." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving} disabled={!rules}>Save</Button></>}>
      {!rules ? <Spinner /> : (
        <div className="space-y-4">
          <Field label="Default incentive">
            <div className="flex gap-2">
              <Input type="number" min="0" step="any" value={rules.defaultValue} onChange={(e) => setRules({ ...rules, defaultValue: e.target.value })} />
              <TypeSelect value={rules.defaultType} onChange={(v) => setRules({ ...rules, defaultType: v })} />
            </div>
          </Field>
          <div>
            <div className="mb-1.5 text-xs font-medium text-zinc-600">Per service (leave empty to use the default)</div>
            <div className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200">
              {services.map((s) => {
                const r = ruleFor(s._id);
                return (
                  <div key={s._id} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 truncate text-sm">{s.name}</span>
                    <Input type="number" min="0" step="any" className="w-28" placeholder="Default" value={r?.value ?? ''} onChange={(e) => setRule(s._id, { value: e.target.value })} />
                    <TypeSelect value={r?.type || 'percent'} onChange={(v) => setRule(s._id, { type: v })} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Incentives() {
  const { user, can } = useAuth();
  const canManage = can('incentives', 'manage');
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [tab, setTab] = useState('Pending');
  const [list, setList] = useState(null);
  const [summary, setSummary] = useState(null);
  const [refer, setRefer] = useState(false);
  const [converting, setConverting] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const load = useCallback(() => {
    api.get('/referrals/summary', { params: { month } }).then((r) => setSummary(r.data));
    api.get('/referrals', { params: tab === 'Pending' ? { status: 'Pending' } : { month, ...(tab !== 'all' && { status: tab }) } }).then((r) => setList(r.data));
  }, [month, tab]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => {
    try {
      const { data } = await fn();
      toast.success(data.message);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const reject = (r) => {
    const reason = window.prompt('Why was it not converted? (optional)');
    if (reason !== null) act(() => api.post(`/referrals/${r._id}/reject`, { reason }));
  };
  const remove = (r) => window.confirm('Remove this referral?') && act(() => api.delete(`/referrals/${r._id}`));

  const seesAll = list?.seesAll;
  const s = summary?.stats;
  return (
    <div>
      <PageHeader title={seesAll ? 'Refer & Incentive' : 'My Referrals & Incentive'} description="Refer a service to a customer — when it is sold, the incentive is counted and added to payroll."
        actions={<>
          <div className="w-44"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
          {canManage && <Button variant="secondary" icon={Settings2} onClick={() => setRulesOpen(true)}>Rules</Button>}
          <Button icon={Share2} onClick={() => setRefer(true)}>Refer a Service</Button>
        </>} />
      {s && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Referred" value={s.referred} icon={Share2} sub={monthLabel(month + '-01')} />
          <StatCard label="Waiting" value={s.pending} icon={Clock} tone="amber" sub="All pending referrals" />
          <StatCard label="Converted" value={s.converted} icon={CheckCircle2} tone="green" sub={monthLabel(month + '-01')} />
          <StatCard label={seesAll ? 'Total incentive' : 'My incentive'} value={formatMoney(s.incentive)} icon={Gift} tone="violet" sub="Added to payroll" />
        </div>
      )}

      {seesAll && summary?.members.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3 text-sm font-semibold">Incentive by member — {monthLabel(month + '-01')}</div>
          {/* Phones & tablets: cards */}
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {summary.members.map((m) => (
              <div key={m.member._id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar name={m.member.name} />
                  <div className="min-w-0 flex-1"><div className="truncate font-medium">{m.member.name}</div><div className="text-xs text-zinc-400">{m.member.designation || ROLE_LABEL[m.member.role]}</div></div>
                  <span className="font-semibold tabular-nums">{formatMoney(m.incentive)}</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center tabular-nums">
                  <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Referred</dt><dd className="font-semibold">{m.referred}</dd></div>
                  <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Converted</dt><dd className="font-semibold">{m.converted}</dd></div>
                  <div className="rounded-lg bg-zinc-50 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Waiting</dt><dd className="font-semibold">{m.pending}</dd></div>
                </dl>
              </div>
            ))}
          </div>

          {/* Laptop and up: table */}
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-zinc-100 text-left text-xs text-zinc-500"><th className="px-5 py-2 font-medium">Member</th><th className="px-3 py-2 text-center font-medium">Referred</th><th className="px-3 py-2 text-center font-medium">Converted</th><th className="px-3 py-2 text-center font-medium">Waiting</th><th className="px-5 py-2 text-right font-medium">Incentive</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {summary.members.map((m) => (
                <tr key={m.member._id}>
                  <td className="px-5 py-2.5"><div className="flex items-center gap-2.5"><Avatar name={m.member.name} size="sm" /><span className="font-medium">{m.member.name}</span><span className="text-xs text-zinc-400">{m.member.designation || ROLE_LABEL[m.member.role]}</span></div></td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{m.referred}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{m.converted}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{m.pending}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{formatMoney(m.incentive)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      )}

      <Tabs className="mb-3" value={tab} onChange={setTab} items={[{ key: 'Pending', label: 'Pending' }, { key: 'Converted', label: 'Converted' }, { key: 'Rejected', label: 'Not converted' }, { key: 'all', label: 'All this month' }]} />
      <Card className="overflow-hidden">
        {!list ? <Spinner /> : list.data.length === 0 ? (
          <EmptyState icon={Gift} title="No referrals here" message="Spot a customer who needs another service? Refer it and earn an incentive." action={<Button icon={Plus} onClick={() => setRefer(true)}>Refer a Service</Button>} />
        ) : (
          <>
          {/* Phones & tablets: cards */}
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {list.data.map((r) => (
              <div key={r._id} className="flex flex-col rounded-xl border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{r.customer?.businessName}</div>
                    <div className="text-xs text-zinc-500">{r.service?.name} · referred {shortDay(r.referredOn)}</div>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </div>
                {r.note && <div className="mt-2 text-xs text-zinc-500">{r.note}</div>}
                {seesAll && <div className="mt-2 flex items-center gap-2 text-sm"><Avatar name={r.referredBy?.name} size="sm" />{r.referredBy?.name}</div>}
                {r.status === 'Converted' && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                    <span className="text-xs text-zinc-500">{shortDay(r.convertedOn)}{r.sale ? ` · ${r.sale.saleNo}` : ''}</span>
                    <span className="font-semibold tabular-nums">{formatMoney(r.incentive)}</span>
                  </div>
                )}
                {r.status === 'Rejected' && r.rejectReason && <div className="mt-2 text-xs text-zinc-400">{r.rejectReason}</div>}
                <div className="mt-auto flex flex-wrap justify-end gap-1 pt-3">
                  {canManage && r.status === 'Pending' && <Button size="sm" icon={CheckCircle2} onClick={() => setConverting(r)}>Converted</Button>}
                  {canManage && r.status === 'Pending' && <Button size="sm" variant="secondary" icon={XCircle} onClick={() => reject(r)}>No</Button>}
                  {canManage && r.status !== 'Pending' && <Button size="icon" variant="ghost" title="Move back to pending" onClick={() => act(() => api.post(`/referrals/${r._id}/reopen`))}><RotateCcw className="h-4 w-4" /></Button>}
                  {(canManage || (r.status === 'Pending' && r.referredBy?._id === user._id)) && <Button size="icon" variant="ghost" onClick={() => remove(r)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            ))}
          </div>

          {/* Laptop and up: table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                <th className="px-5 py-2.5 font-medium">Referred</th><th className="px-3 py-2.5 font-medium">Customer / Service</th>{seesAll && <th className="px-3 py-2.5 font-medium">By</th>}
                <th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 text-right font-medium">Incentive</th><th className="px-5 py-2.5" />
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {list.data.map((r) => (
                  <tr key={r._id} className="hover:bg-zinc-50/60">
                    <td className="whitespace-nowrap px-5 py-3">{shortDay(r.referredOn)}</td>
                    <td className="px-3 py-3"><div className="font-medium">{r.customer?.businessName}</div><div className="text-xs text-zinc-500">{r.service?.name}{r.note ? ` · ${r.note}` : ''}</div></td>
                    {seesAll && <td className="px-3 py-3"><div className="flex items-center gap-2"><Avatar name={r.referredBy?.name} size="sm" />{r.referredBy?.name}</div></td>}
                    <td className="px-3 py-3">
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        {r.status === 'Converted' && `${shortDay(r.convertedOn)}${r.sale ? ` · ${r.sale.saleNo}` : ''}`}
                        {r.status === 'Rejected' && r.rejectReason}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{r.status === 'Converted' ? formatMoney(r.incentive) : <span className="font-normal text-zinc-300">—</span>}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {canManage && r.status === 'Pending' && <Button size="sm" icon={CheckCircle2} onClick={() => setConverting(r)}>Converted</Button>}
                        {canManage && r.status === 'Pending' && <Button size="sm" variant="secondary" icon={XCircle} onClick={() => reject(r)}>No</Button>}
                        {canManage && r.status !== 'Pending' && <Button size="icon" variant="ghost" title="Move back to pending" onClick={() => act(() => api.post(`/referrals/${r._id}/reopen`))}><RotateCcw className="h-4 w-4" /></Button>}
                        {(canManage || (r.status === 'Pending' && r.referredBy?._id === user._id)) && <Button size="icon" variant="ghost" onClick={() => remove(r)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>}
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
      <ReferDialog open={refer} canPickMember={canManage} onClose={() => setRefer(false)} onSaved={load} />
      <ConvertDialog referral={converting} onClose={() => setConverting(null)} onDone={load} />
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
