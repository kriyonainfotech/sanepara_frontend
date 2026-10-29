import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Layers, Mail, MapPin, Pencil, Phone, Plus, Receipt, Trash2, UserPlus, UserRound, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney, localToday } from '../lib/format';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Progress from '../components/ui/Progress';
import { Field, Input, Select } from '../components/ui/Field';
import CustomerFormModal from '../components/CustomerFormModal';
import CustomerAccount from '../components/sales/CustomerAccount';
import SaleDialog from '../components/sales/SaleDialog';

const STATUS = {
  pending: { label: 'Unscheduled', tone: 'amber' },
  in_progress: { label: 'In progress', tone: 'violet' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'zinc' },
};

function Info({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
      <div className="min-w-0">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className={`mt-0.5 break-words text-sm text-zinc-900 ${mono ? 'font-mono' : ''}`}>{value || <span className="text-zinc-400">—</span>}</div>
      </div>
    </div>
  );
}

// Assigning a service can also create its sale: fees, sold by, B2B partner,
// a referral person and the member's incentive are all set here.
function AssignServiceModal({ open, onClose, customer, onAssigned }) {
  const { user, can } = useAuth();
  const canSale = can('sales', 'create');
  const canIncentive = can('incentives', 'manage');
  const [services, setServices] = useState([]);
  const [members, setMembers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [withSale, setWithSale] = useState(true);
  const [f, setF] = useState({});
  const [incentiveEdited, setIncentiveEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setServiceId('');
    setWithSale(canSale);
    setIncentiveEdited(false);
    const partner = customer?.referredByPartner;
    setF({
      title: '', saleDate: localToday(), professionalFee: '', govtFee: '', soldBy: user._id,
      b2bPartner: partner?._id || '', b2bPercent: partner?.percentage ?? '',
      referredBy: partner?._id ? '' : customer?.referredBy || '', referralAmount: '',
      incentiveMember: '', incentive: '',
    });
    api.get('/services', { params: { active: true } }).then((r) => setServices(r.data.services));
    if (canSale) {
      api.get('/users', { params: { active: true } }).then((r) => setMembers(r.data.users)).catch(() => setMembers([]));
      api.get('/b2b/options').then((r) => {
        setPartners(r.data.data);
        // The customer's partner percentage, once the list (with %) has loaded.
        if (partner?._id) setF((x) => (x.b2bPartner === partner._id && x.b2bPercent === '' ? { ...x, b2bPercent: r.data.data.find((p) => p._id === partner._id)?.percentage ?? '' } : x));
      }).catch(() => setPartners([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = services.find((s) => s._id === serviceId);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const pickService = (id) => {
    setServiceId(id);
    const s = services.find((x) => x._id === id);
    setF((x) => ({ ...x, title: s?.name || '', professionalFee: s?.price || '' }));
  };
  const pickPartner = (id) => setF((x) => ({ ...x, b2bPartner: id, b2bPercent: partners.find((p) => p._id === id)?.percentage ?? '' }));

  // Suggested incentive from the incentive rules, until it is typed over.
  useEffect(() => {
    if (!open || !withSale || !canIncentive || !serviceId || !f.incentiveMember || incentiveEdited) return;
    let live = true;
    api.get('/referrals/suggest-incentive', { params: { service: serviceId, fee: Number(f.professionalFee) || 0 } })
      .then((r) => live && setF((x) => ({ ...x, incentive: r.data.incentive })))
      .catch(() => {});
    return () => { live = false; };
  }, [open, withSale, canIncentive, serviceId, f.incentiveMember, f.professionalFee, incentiveEdited]);

  const fee = Number(f.professionalFee) || 0;
  const total = fee + (Number(f.govtFee) || 0);
  const commission = f.b2bPartner ? (fee * (Number(f.b2bPercent) || 0)) / 100 : 0;
  const referral = f.referredBy?.trim() ? Number(f.referralAmount) || 0 : 0;
  const incentive = f.incentiveMember ? Number(f.incentive) || 0 : 0;

  const submit = async () => {
    if (withSale && total <= 0) return toast.error('Enter the professional fee and/or government fee');
    setSaving(true);
    try {
      const sale = withSale ? {
        ...f,
        referredBy: f.referredBy?.trim() || '',
        referralAmount: referral,
        incentiveMember: canIncentive ? f.incentiveMember : '',
      } : undefined;
      const { data } = await api.post(`/customers/${customer._id}/services`, { serviceId, sale });
      toast.success(data.sale ? `Service assigned and sale ${data.sale.saleNo} created` : 'Service assigned — its tasks are now in Schedule Management');
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      scroll
      title="Assign service"
      description="Each task of the service will appear in Schedule Management as unscheduled work."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!serviceId} loading={saving}>{withSale ? 'Assign & create sale' : 'Assign'}</Button>
        </>
      }
    >
      <Field label="Service">
        <Select value={serviceId} onChange={(e) => pickService(e.target.value)}>
          <option value="">Select a service…</option>
          {services.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </Select>
      </Field>
      {selected && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">{selected.tasks.length} tasks included</div>
          <ol className="space-y-1.5">
            {selected.tasks.map((t, i) => (
              <li key={t._id} className="flex gap-2 text-sm text-zinc-700">
                <span className="w-4 text-right text-xs leading-5 tabular-nums text-zinc-400">{i + 1}</span>
                {t.title}
              </li>
            ))}
          </ol>
        </div>
      )}

      {canSale && selected && (
        <div className="mt-4 rounded-lg border border-zinc-200 p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={withSale} onChange={(e) => setWithSale(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
            Create sale entry
          </label>
          {withSale && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Work" className="sm:col-span-2"><Input value={f.title} onChange={set('title')} placeholder={selected.name} /></Field>
                <Field label="Professional fee (₹)"><Input type="number" min="0" step="any" value={f.professionalFee} onChange={set('professionalFee')} /></Field>
                <Field label="Government fee (₹)"><Input type="number" min="0" step="any" value={f.govtFee} onChange={set('govtFee')} /></Field>
                <Field label="Sale date"><Input type="date" value={f.saleDate} onChange={set('saleDate')} /></Field>
                <Field label="Sold by">
                  <Select value={f.soldBy} onChange={set('soldBy')}>
                    <option value="">—</option>
                    {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2">
                <Field label="B2B partner">
                  <Select value={f.b2bPartner} onChange={(e) => pickPartner(e.target.value)}>
                    <option value="">No partner</option>
                    {partners.map((p) => <option key={p._id} value={p._id}>{p.name}{p.firmName ? ` — ${p.firmName}` : ''} ({p.percentage}%)</option>)}
                  </Select>
                </Field>
                <Field label="Partner %" hint={f.b2bPartner ? `Commission ${formatMoney(commission)}` : undefined}>
                  <Input type="number" min="0" max="100" step="any" disabled={!f.b2bPartner} value={f.b2bPercent} onChange={set('b2bPercent')} />
                </Field>
                <Field label="Referred by (person)"><Input value={f.referredBy} onChange={set('referredBy')} placeholder="Name, if a person referred it" /></Field>
                <Field label="Amount for referral person (₹)">
                  <Input type="number" min="0" step="any" disabled={!f.referredBy?.trim()} value={f.referralAmount} onChange={set('referralAmount')} />
                </Field>
                {canIncentive && (
                  <>
                    <Field label="Incentive to member">
                      <Select value={f.incentiveMember} onChange={(e) => { setIncentiveEdited(false); setF((x) => ({ ...x, incentiveMember: e.target.value, incentive: '' })); }}>
                        <option value="">No incentive</option>
                        {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </Select>
                    </Field>
                    <Field label="Incentive (₹)" hint={f.incentiveMember && !incentiveEdited ? 'As per incentive rules — you can change it' : undefined}>
                      <Input type="number" min="0" step="any" disabled={!f.incentiveMember} value={f.incentive} onChange={(e) => { setIncentiveEdited(true); set('incentive')(e); }} />
                    </Field>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-zinc-50 p-3 text-sm sm:grid-cols-3">
                <div className="text-zinc-500">Total bill</div><div className="text-right font-semibold tabular-nums sm:col-span-2">{formatMoney(total)}</div>
                {commission > 0 && <><div className="text-zinc-500">B2B commission</div><div className="text-right tabular-nums sm:col-span-2">− {formatMoney(commission)}</div></>}
                {referral > 0 && <><div className="text-zinc-500">Referral person</div><div className="text-right tabular-nums sm:col-span-2">− {formatMoney(referral)}</div></>}
                {incentive > 0 && <><div className="text-zinc-500">Incentive</div><div className="text-right tabular-nums sm:col-span-2">− {formatMoney(incentive)}</div></>}
                <div className="border-t border-zinc-200 pt-1 font-medium">Firm keeps (of professional fee)</div>
                <div className="border-t border-zinc-200 pt-1 text-right font-semibold tabular-nums sm:col-span-2">{formatMoney(fee - commission - referral - incentive)}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canAssign = can('services', 'assign');
  const [data, setData] = useState(null);
  const [billing, setBilling] = useState(null); // assigned service to create a sale for
  const [accountKey, setAccountKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removing, setRemoving] = useState(null); // assigned service to remove
  const [removingService, setRemovingService] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    api.get(`/customers/${id}`).then((r) => setData(r.data)).catch((err) => {
      toast.error(errorMessage(err));
      navigate('/customers');
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const removeCustomer = async () => {
    setDeleting(true);
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted');
      navigate('/customers');
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  // Asks first; the service's sale entry (if any) is removed with it.
  const removeService = async () => {
    setRemovingService(true);
    try {
      const { data: res } = await api.delete(`/customers/${id}/services/${removing._id}`);
      toast.success(res.message);
      setRemoving(null);
      load();
      setAccountKey((k) => k + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemovingService(false);
    }
  };

  if (!data) return <Spinner />;
  const { customer, services } = data;

  return (
    <div>
      <Link to="/customers" className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="scale-125"><Avatar name={customer.businessName} /></div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{customer.businessName}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Added by {customer.addedBy?.name || '—'} on {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {can('customers', 'edit') && <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button>}
          {can('customers', 'delete') && <Button variant="secondary" icon={Trash2} onClick={() => setConfirmDelete(true)} className="hover:!text-red-600">Delete</Button>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-5 p-5 lg:col-span-1 self-start">
          <h2 className="text-sm font-semibold">Details</h2>
          <Info icon={UserRound} label="Contact person" value={customer.contactPerson} />
          <Info icon={Phone} label="Mobile" value={customer.phone} />
          <Info icon={Receipt} label="GST number" value={customer.gstNumber} mono />
          <Info icon={Mail} label="Email" value={customer.email} />
          <Info icon={MapPin} label="Address" value={customer.address} />
          <Info icon={UserPlus} label="Referred by" value={customer.referredByPartner ? `${customer.referredByPartner.name}${customer.referredByPartner.firmName ? ` — ${customer.referredByPartner.firmName}` : ''} (B2B partner)` : customer.referredBy} />
          {customer.notes && (
            <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">{customer.notes}</div>
          )}
        </Card>

        <Card className="lg:col-span-2 self-start">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold">Services</h2>
            {canAssign && <Button size="sm" icon={Plus} onClick={() => setAssignOpen(true)}>Assign service</Button>}
          </div>
          {services.length === 0 ? (
            <EmptyState icon={Layers} title="No services assigned" message="Assign a service like GST filing to start scheduling work for this customer." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {services.map((s) => (
                <li key={s._id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.service?.name || 'Deleted service'}{s.periodLabel && <span className="font-normal text-zinc-500"> · {s.periodLabel}</span>}</div>
                    <div className="text-xs text-zinc-500">
                      {s.done}/{s.total} done · {s.scheduled} scheduled · assigned {formatDate(s.createdAt)}
                    </div>
                    <Progress done={s.done} total={s.total} className="mt-1.5 max-w-56" />
                  </div>
                  {s.billing !== undefined && (
                    s.billing ? (
                      <span className="text-right text-xs">
                        <span className="font-medium text-emerald-700">Billed {formatMoney(s.billing.amount)}</span>
                        {s.billing.balance > 0 && <span className="block text-rose-600">{formatMoney(s.billing.balance)} due</span>}
                      </span>
                    ) : can('sales', 'create') ? (
                      <Button size="sm" variant="secondary" onClick={() => setBilling(s)}>Create sale</Button>
                    ) : (
                      <span className="text-xs text-amber-600">Not billed</span>
                    )
                  )}
                  <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                  {canAssign && s.status === 'pending' && !s.scheduled && (
                    <button onClick={() => setRemoving(s)} title="Remove" className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {can('sales', 'view') && (
        <div className="mt-6">
          <CustomerAccount customerId={id} refreshKey={accountKey} onChanged={load} />
        </div>
      )}

      <SaleDialog
        open={!!billing}
        onClose={() => setBilling(null)}
        preset={billing && { customer: id, customerService: billing._id, title: [billing.service?.name, billing.periodLabel].filter(Boolean).join(' · '), professionalFee: billing.service?.price || '' }}
        onSaved={() => { load(); setAccountKey((k) => k + 1); }}
      />
      <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} customer={customer} onSaved={load} />
      <AssignServiceModal open={assignOpen} onClose={() => setAssignOpen(false)} customer={customer} onAssigned={load} />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={removeService}
        loading={removingService}
        title="Remove service?"
        confirmText="Remove"
        message={removing && `${removing.service?.name || 'This service'} will be removed from ${customer.businessName} along with its pending tasks.${removing.billing ? ` Its sale entry of ${formatMoney(removing.billing.amount)} will also be deleted.` : ''}`}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={removeCustomer}
        loading={deleting}
        title="Delete customer?"
        message={`${customer.businessName} and all its assigned services will be permanently removed.`}
      />
    </div>
  );
}
