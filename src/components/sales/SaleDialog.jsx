import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, localToday } from '../../lib/format';
import { PAY_MODES } from '../../lib/sales';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';
import SearchSelect from '../tasks/SearchSelect';
import BankSelect from '../BankSelect';
import FirmSelect from '../FirmSelect';

/**
 * Create / edit a sale. `preset` can fix the customer and pre-pick an assigned
 * service (e.g. "Create sale" from the customer page).
 */
export default function SaleDialog({ open, onClose, onSaved, sale, preset }) {
  const { user } = useAuth();
  const editing = Boolean(sale?._id);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]); // customer's assigned services
  const [allServices, setAllServices] = useState([]); // company master services
  const [gsts, setGsts] = useState([]); // customer's firms
  const [members, setMembers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get('/customers/options').then((r) => setCustomers(r.data.data));
    api.get('/services', { params: { active: true } }).then((r) => setAllServices(r.data.services || [])).catch(() => setAllServices([]));
    api.get('/users', { params: { active: true } }).then((r) => setMembers(r.data.users));
    api.get('/b2b').then((r) => setPartners(r.data.data.filter((p) => p.isActive || p._id === (sale?.b2bPartner?._id || sale?.b2bPartner)))).catch(() => setPartners([]));
    setF(
      editing
        ? {
            customer: sale.customer?._id || sale.customer, customerService: sale.customerService || '', service: sale.service?._id || sale.service || '', gstNumber: sale.gstNumber || '', title: sale.title,
            professionalFee: sale.professionalFee, govtFee: sale.govtFee, saleDate: sale.saleDate,
            soldBy: sale.soldBy?._id || sale.soldBy || '', b2bPartner: sale.b2bPartner?._id || sale.b2bPartner || '', b2bPercent: sale.b2bPercent ?? '', referredBy: sale.referredBy || '', referralAmount: sale.referralAmount || '', notes: sale.notes || '',
          }
        : {
            customer: preset?.customer || '', customerService: preset?.customerService || '', service: preset?.service || '', gstNumber: preset?.gstNumber || '', title: preset?.title || '',
            professionalFee: preset?.professionalFee ?? '', govtFee: '', saleDate: localToday(), soldBy: user._id,
            b2bPartner: '', b2bPercent: '', referredBy: '', referralAmount: '', notes: '', receivedNow: '', receivedMode: 'Cash', receivedBank: '',
          }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load the chosen customer's assigned services.
  useEffect(() => {
    if (!open || !f.customer) { setGsts([]); return setServices([]); }
    api.get(`/customers/${f.customer}`).then((r) => {
      setServices(r.data.services);
      const list = r.data.customer.gsts || [];
      setGsts(list);
      // A customer with a single firm bills to it by default.
      if (!editing && list.length === 1) setF((x) => (x.customerService || x.gstNumber ? x : { ...x, gstNumber: list[0].gstNumber }));
    }).catch(() => { setServices([]); setGsts([]); });
  }, [open, f.customer]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const pickAssignedService = (id) => {
    const s = services.find((x) => x._id === id);
    setF((x) => ({
      ...x,
      customerService: id,
      service: s?.service?._id || '',
      ...(s?.gstNumber && { gstNumber: s.gstNumber }),
      ...(s && !editing && {
        title: [s.service?.name, s.periodLabel].filter(Boolean).join(' · '),
        professionalFee: s.service?.price || x.professionalFee || '',
      }),
    }));
  };
  const pickMasterService = (id) => {
    const s = allServices.find((x) => x._id === id);
    setF((x) => ({
      ...x,
      customerService: '',
      service: id,
      ...(!editing && s && {
        title: s.name,
        professionalFee: s.price || x.professionalFee || '',
      }),
    }));
  };
  const pickPartner = (id) => setF((x) => ({ ...x, b2bPartner: id, b2bPercent: partners.find((p) => p._id === id)?.percentage ?? '' }));

  const total = (Number(f.professionalFee) || 0) + (Number(f.govtFee) || 0);
  const commission = f.b2bPartner ? ((Number(f.professionalFee) || 0) * (Number(f.b2bPercent) || 0)) / 100 : 0;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...f, professionalFee: Number(f.professionalFee) || 0, govtFee: Number(f.govtFee) || 0, referralAmount: f.referredBy?.trim() ? Number(f.referralAmount) || 0 : 0 };
      const { data } = editing ? await api.put(`/sales/${sale._id}`, payload) : await api.post('/sales', payload);
      toast.success(data.message);
      onSaved?.(data.data);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? `Edit Sale ${sale.saleNo}` : 'New Sale'} footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="sale-form" loading={saving}>{editing ? 'Save Changes' : 'Create Sale'}</Button>
      </>
    }>
      <form id="sale-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" required>
            {preset?.customer || editing ? (
              <Input disabled value={customers.find((c) => c._id === f.customer)?.businessName || sale?.customer?.businessName || ''} />
            ) : (
              <SearchSelect width="w-full" options={customers.map((c) => ({ value: c._id, label: c.businessName }))} value={f.customer || 'all'}
                onChange={(v) => setF((x) => ({ ...x, customer: v === 'all' ? '' : v, customerService: '', gstNumber: '' }))} allLabel="Select customer…" placeholder="Search customer..." />
            )}
          </Field>
          <Field label="Service / Work" hint="Pick an assigned service, a company service, or choose 'Other work'">
            <Select
              value={f.customerService ? `cs:${f.customerService}` : f.service ? `s:${f.service}` : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setF((x) => ({ ...x, customerService: '', service: '' }));
                } else if (val.startsWith('cs:')) {
                  pickAssignedService(val.slice(3));
                } else if (val.startsWith('s:')) {
                  pickMasterService(val.slice(2));
                }
              }}
              disabled={!f.customer}
            >
              <option value="">— Other work / Custom —</option>
              {services.length > 0 && (
                <optgroup label="Customer's Assigned Services">
                  {services.map((s) => (
                    <option key={s._id} value={`cs:${s._id}`}>
                      {s.service?.name}{s.periodLabel ? ` · ${s.periodLabel}` : ''}{s.firmName || s.gstNumber ? ` · ${s.firmName || s.gstNumber}` : ''}{s.billing ? ' (already billed)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {allServices.length > 0 && (
                <optgroup label="Company Services">
                  {allServices.map((s) => (
                    <option key={s._id} value={`s:${s._id}`}>
                      {s.name} {s.price ? `(₹${s.price})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </Field>
        </div>
        <FirmSelect gsts={gsts} value={f.gstNumber} onChange={(v) => set('gstNumber', v)} customerName={customers.find((c) => c._id === f.customer)?.businessName}
          disabled={Boolean(services.find((s) => s._id === f.customerService)?.gstNumber)} hint={services.find((s) => s._id === f.customerService)?.gstNumber ? 'Same firm as the assigned service.' : undefined} />
        <Field label="Work / description" required>
          <Input required value={f.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="e.g. GST filing — October" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Professional fee (₹)"><Input type="number" min="0" step="any" value={f.professionalFee ?? ''} onChange={(e) => set('professionalFee', e.target.value)} placeholder="0" /></Field>
          <Field label="Government fee (₹)" hint="Paid to govt — not your income"><Input type="number" min="0" step="any" value={f.govtFee ?? ''} onChange={(e) => set('govtFee', e.target.value)} placeholder="0" /></Field>
          <Field label="Total"><div className="flex h-9 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold">{formatMoney(total)}</div></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sale date" required><Input type="date" required value={f.saleDate || ''} onChange={(e) => set('saleDate', e.target.value)} /></Field>
          <Field label="Sold by" hint="Credited for incentive">
            <Select value={f.soldBy || ''} onChange={(e) => set('soldBy', e.target.value)}>
              <option value="">—</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </Select>
          </Field>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="B2B partner" className="sm:col-span-2">
              <Select value={f.b2bPartner || ''} onChange={(e) => pickPartner(e.target.value)}>
                <option value="">No partner</option>
                {partners.map((p) => <option key={p._id} value={p._id}>{p.name}{p.firmName ? ` — ${p.firmName}` : ''} ({p.percentage}%)</option>)}
              </Select>
            </Field>
            <Field label="Partner %"><Input type="number" min="0" max="100" step="any" disabled={!f.b2bPartner} value={f.b2bPercent ?? ''} onChange={(e) => set('b2bPercent', e.target.value)} /></Field>
          </div>
          {f.b2bPartner && <p className="mt-2 text-xs text-zinc-500">Partner commission: <b>{formatMoney(commission)}</b> ({f.b2bPercent || 0}% of professional fee)</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Referred by (person)"><Input value={f.referredBy || ''} onChange={(e) => set('referredBy', e.target.value)} placeholder="Name, if a person referred it" /></Field>
            <Field label="Amount for referral person (₹)"><Input type="number" min="0" step="any" disabled={!f.referredBy?.trim()} value={f.referralAmount ?? ''} onChange={(e) => set('referralAmount', e.target.value)} /></Field>
          </div>
        </div>

        {!editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Received now (₹)" hint="Optional — record a payment with the sale"><Input type="number" min="0" max={total} step="any" value={f.receivedNow ?? ''} onChange={(e) => set('receivedNow', e.target.value)} placeholder="0" /></Field>
            <Field label="Mode">
              <Select value={f.receivedMode} onChange={(e) => set('receivedMode', e.target.value)} disabled={!Number(f.receivedNow)}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</Select>
            </Field>
            <BankSelect label="Received in" value={f.receivedBank} onChange={(v) => set('receivedBank', v)} disabled={!Number(f.receivedNow)} className="sm:col-span-2" />
          </div>
        )}
        <Field label="Notes"><Textarea rows={2} value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </form>
    </Modal>
  );
}
