import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Banknote, Handshake, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, localToday, longDay, monthLabel, shortDay } from '../lib/format';
import { PAY_MODES, SALE_STATUS_TONE } from '../lib/sales';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea } from '../components/ui/Field';

const EMPTY = { name: '', firmName: '', phone: '', email: '', percentage: '', notes: '', isActive: true };

function PartnerDialog({ partner, open, onClose, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setF(partner ? { ...EMPTY, ...partner } : EMPTY); }, [open, partner]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (f.phone && !/^\d{10}$/.test(f.phone)) return toast.error('Mobile number must be exactly 10 digits');
    setSaving(true);
    try {
      const { data } = partner ? await api.put(`/b2b/${partner._id}`, f) : await api.post('/b2b', f);
      toast.success(data.message || 'Partner added');
      onSaved(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={partner ? 'Edit Partner' : 'New B2B Partner'} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="partner-form" loading={saving}>{partner ? 'Save' : 'Add Partner'}</Button></>
    }>
      <form id="partner-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Partner name" required><Input required autoFocus value={f.name} onChange={set('name')} /></Field>
        <Field label="Firm name"><Input value={f.firmName} onChange={set('firmName')} /></Field>
        <Field label="Mobile">
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            pattern="\d{10}"
            title="Enter a 10 digit mobile number"
            value={f.phone || ''}
            onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="10 digit mobile number"
          />
        </Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Commission %" required hint="Of the professional fee on sales they bring" className="sm:col-span-2">
          {/* Number inputs accept e / + / - (scientific notation); a percentage never needs them. */}
          <Input type="number" required min="0" max="100" step="any" value={f.percentage} onChange={set('percentage')} onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()} placeholder="e.g. 20" />
        </Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={f.notes || ''} onChange={set('notes')} /></Field>
        {partner && (
          <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
            <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="accent-zinc-900" /> Active (can be picked on new sales)
          </label>
        )}
      </form>
    </Modal>
  );
}

function PayoutDialog({ partner, onClose, onDone }) {
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (partner) setF({ amount: partner.pending || '', paidOn: localToday(), mode: 'Bank', note: '' }); }, [partner]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post(`/b2b/${partner._id}/payouts`, f);
      toast.success(data.message);
      onDone(); onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={!!partner} onClose={onClose} size="sm" title="Pay Partner" description={partner && `${partner.name} · pending ${formatMoney(partner.pending)}`} footer={
      <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="payout-form" loading={saving}>Record Payout</Button></>
    }>
      <form id="payout-form" onSubmit={submit} className="space-y-4">
        <Field label="Amount (₹)" required><Input type="number" min="1" step="any" required value={f.amount} onChange={set('amount')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Paid on"><Input type="date" value={f.paidOn} onChange={set('paidOn')} /></Field>
          <Field label="Mode"><Select value={f.mode} onChange={set('mode')}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        </div>
        <Field label="Note"><Input value={f.note} onChange={set('note')} /></Field>
      </form>
    </Modal>
  );
}

function PartnerDetail({ partnerId, month, onClose, canEdit, onChanged }) {
  const [data, setData] = useState(null);
  const [scope, setScope] = useState('month');
  const load = useCallback(() => api.get(`/b2b/${partnerId}`, { params: scope === 'month' ? { month } : {} }).then((r) => setData(r.data)), [partnerId, month, scope]);
  useEffect(() => { setData(null); if (partnerId) load(); }, [partnerId, load]);

  const removePayout = async (id) => {
    if (!window.confirm('Remove this payout?')) return;
    try {
      await api.delete(`/b2b/${partnerId}/payouts/${id}`);
      toast.success('Payout removed');
      load(); onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const commission = (data?.sales || []).reduce((a, s) => a + s.b2bCommission, 0);

  return (
    <Modal open={!!partnerId} onClose={onClose} size="lg" title={data?.data.name || 'Partner'} description={data && `${data.data.firmName || ''} ${data.data.percentage}% of professional fee`}>
      {!data ? <Spinner /> : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs font-medium">
              {[['month', monthLabel(month + '-01')], ['all', 'All time']].map(([k, l]) => (
                <button key={k} onClick={() => setScope(k)} className={`rounded-md px-3 py-1 ${scope === k ? 'bg-white shadow-sm' : 'text-zinc-500'}`}>{l}</button>
              ))}
            </div>
            <span className="text-sm">Commission: <b>{formatMoney(commission)}</b></span>
          </div>
          <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 lg:hidden">
            {data.sales.length === 0 ? <li className="py-6 text-center text-sm text-zinc-400">No sales.</li> : data.sales.map((s) => (
              <li key={s._id} className="p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.customer?.businessName}</div>
                    <div className="text-xs text-zinc-500">{shortDay(s.saleDate)} · {s.saleNo} · {s.title}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums">{formatMoney(s.b2bCommission)}</div>
                    <div className="text-[11px] text-zinc-400">{s.b2bPercent}% of {formatMoney(s.professionalFee)}</div>
                  </div>
                </div>
                <div className="mt-1.5 text-xs text-zinc-500">Customer paid: <Badge tone={SALE_STATUS_TONE[s.status]}>{s.status}</Badge></div>
              </li>
            ))}
          </ul>
          <div className="hidden max-h-72 overflow-auto rounded-lg border border-zinc-200 lg:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-left text-xs text-zinc-500"><tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Customer / Work</th><th className="px-3 py-2 text-right font-medium">Prof. fee</th><th className="px-3 py-2 text-right font-medium">Commission</th><th className="px-3 py-2 font-medium">Customer paid</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {data.sales.length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-zinc-400">No sales.</td></tr> : data.sales.map((s) => (
                  <tr key={s._id}>
                    <td className="px-3 py-2 whitespace-nowrap">{shortDay(s.saleDate)}</td>
                    <td className="px-3 py-2"><div className="font-medium">{s.customer?.businessName}</div><div className="text-xs text-zinc-500">{s.saleNo} · {s.title}</div></td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(s.professionalFee)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(s.b2bCommission)}<div className="text-[11px] font-normal text-zinc-400">{s.b2bPercent}%</div></td>
                    <td className="px-3 py-2"><Badge tone={SALE_STATUS_TONE[s.status]}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Payouts</h4>
            {data.payouts.length === 0 ? <p className="text-sm text-zinc-400">Nothing paid yet.</p> : (
              <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                {data.payouts.map((p) => (
                  <li key={p._id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-24 shrink-0 text-xs text-zinc-500 sm:w-36 sm:text-sm">{longDay(p.paidOn)}</span><Badge>{p.mode}</Badge>
                    <span className="flex-1 truncate text-zinc-500">{p.note}</span>
                    <span className="font-semibold tabular-nums">{formatMoney(p.amount)}</span>
                    {canEdit && <button onClick={() => removePayout(p._id)} className="rounded p-1 text-zinc-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function B2B() {
  const { can } = useAuth();
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [paying, setPaying] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => api.get('/b2b', { params: { month } }).then((r) => setData(r.data)), [month]);
  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    try {
      await api.delete(`/b2b/${deleting._id}`);
      toast.success('Partner deleted');
      setDeleting(null); load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const s = data?.stats;
  return (
    <div>
      <PageHeader title="B2B Partners" description="Partners who bring customers, their % of the professional fee, and what they are owed."
        actions={<>
          <div className="w-40"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
          {can('b2b', 'create') && <Button icon={Plus} onClick={() => setEditing(null)}>New Partner</Button>}
        </>} />
      {!data ? <Spinner /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-5"><div className="text-sm text-zinc-500">Active partners</div><div className="mt-1 text-2xl font-semibold">{s.partners}</div></Card>
            <Card className="p-5"><div className="text-sm text-zinc-500">Commission this month</div><div className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(s.monthCommission)}</div><div className="text-xs text-zinc-500">{monthLabel(month + '-01')}</div></Card>
            <Card className="p-5"><div className="text-sm text-zinc-500">Paid to partners</div><div className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{formatMoney(s.paid)}</div><div className="text-xs text-zinc-500">All time</div></Card>
            <Card className="p-5"><div className="text-sm text-zinc-500">Pending to pay</div><div className="mt-1 text-2xl font-semibold tabular-nums text-rose-600">{formatMoney(s.pending)}</div><div className="text-xs text-zinc-500">All time</div></Card>
          </div>
          <Card className="overflow-hidden">
            {data.data.length === 0 ? (
              <EmptyState icon={Handshake} title="No B2B partners yet" message="Add a partner with their %, then pick them on a sale." action={can('b2b', 'create') && <Button icon={Plus} onClick={() => setEditing(null)}>New Partner</Button>} />
            ) : (
              <>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
                {data.data.map((p) => (
                  <div key={p._id} className="rounded-xl border border-zinc-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => setViewing(p._id)} className="flex min-w-0 items-center gap-3 text-left">
                        <Avatar name={p.name} />
                        <div className="min-w-0"><div className="truncate font-medium hover:underline">{p.name} {!p.isActive && <Badge>Inactive</Badge>}</div><div className="truncate text-xs text-zinc-500">{[p.firmName, p.phone].filter(Boolean).join(' · ')}</div></div>
                      </button>
                      <Badge tone="blue">{p.percentage}%</Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-zinc-50 px-3 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">This month</dt><dd className="text-sm font-semibold tabular-nums">{formatMoney(p.month.commission)}</dd><dd className="text-[11px] text-zinc-400">{p.month.sales} sale{p.month.sales === 1 ? '' : 's'}</dd></div>
                      <div className="rounded-lg bg-zinc-50 px-3 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Total commission</dt><dd className="text-sm font-semibold tabular-nums">{formatMoney(p.allTime.commission)}</dd><dd className="truncate text-[11px] text-zinc-400">on {formatMoney(p.allTime.business)}</dd></div>
                      <div className="rounded-lg bg-zinc-50 px-3 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Paid</dt><dd className="text-sm tabular-nums text-emerald-700">{formatMoney(p.paid)}</dd></div>
                      <div className="rounded-lg bg-zinc-50 px-3 py-2"><dt className="text-[10px] font-semibold uppercase text-zinc-400">Pending</dt><dd className={`text-sm font-semibold tabular-nums ${p.pending > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>{formatMoney(p.pending)}</dd></div>
                    </dl>
                    {(can('b2b', 'edit') || can('b2b', 'delete')) && (
                      <div className="mt-3 flex justify-end gap-1">
                        {can('b2b', 'edit') && <Button size="sm" icon={Banknote} onClick={() => setPaying(p)} disabled={!p.pending}>Pay</Button>}
                        {can('b2b', 'edit') && <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>}
                        {can('b2b', 'delete') && <Button size="icon" variant="ghost" onClick={() => setDeleting(p)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Partner</th><th className="px-3 py-2.5 text-center font-medium">%</th>
                  <th className="px-3 py-2.5 text-right font-medium">This month</th><th className="px-3 py-2.5 text-right font-medium">Total commission</th>
                  <th className="px-3 py-2.5 text-right font-medium">Paid</th><th className="px-3 py-2.5 text-right font-medium">Pending</th><th className="px-5 py-2.5" />
                </tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.data.map((p) => (
                    <tr key={p._id} className="hover:bg-zinc-50/60">
                      <td className="px-5 py-3">
                        <button onClick={() => setViewing(p._id)} className="flex items-center gap-3 text-left">
                          <Avatar name={p.name} />
                          <div><div className="font-medium hover:underline">{p.name} {!p.isActive && <Badge>Inactive</Badge>}</div><div className="text-xs text-zinc-500">{[p.firmName, p.phone].filter(Boolean).join(' · ')}</div></div>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold">{p.percentage}%</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatMoney(p.month.commission)}<div className="text-[11px] text-zinc-400">{p.month.sales} sale{p.month.sales === 1 ? '' : 's'}</div></td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatMoney(p.allTime.commission)}<div className="text-[11px] text-zinc-400">on {formatMoney(p.allTime.business)} business</div></td>
                      <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{formatMoney(p.paid)}</td>
                      <td className={`px-3 py-3 text-right font-semibold tabular-nums ${p.pending > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>{formatMoney(p.pending)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {can('b2b', 'edit') && <Button size="sm" icon={Banknote} onClick={() => setPaying(p)} disabled={!p.pending}>Pay</Button>}
                          {can('b2b', 'edit') && <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>}
                          {can('b2b', 'delete') && <Button size="icon" variant="ghost" onClick={() => setDeleting(p)} className="hover:!text-red-600"><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              </>
            )}
          </Card>
        </>
      )}
      <PartnerDialog open={editing !== undefined} partner={editing} onClose={() => setEditing(undefined)} onSaved={load} />
      <PayoutDialog partner={paying} onClose={() => setPaying(null)} onDone={load} />
      <PartnerDetail partnerId={viewing} month={month} onClose={() => setViewing(null)} canEdit={can('b2b', 'edit')} onChanged={load} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete partner?" message={`${deleting?.name} will be removed. Partners with sales can only be made inactive.`} />
    </div>
  );
}
