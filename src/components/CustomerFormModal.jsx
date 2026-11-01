import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Field, Input, Textarea } from './ui/Field';
import { api, errorMessage } from '../lib/api';
import { GST_RE, stateOf } from '../lib/gst';

const EMPTY = { businessName: '', contactPerson: '', phone: '', email: '', gsts: [], address: '', referredBy: '', referredByPartner: '', notes: '' };
const EMPTY_GST = { gstNumber: '', firmName: '', ownerName: '', address: '' };
const partnerLabel = (p) => `${p.name}${p.firmName ? ` — ${p.firmName}` : ''}`;

// The customer's GST registrations: one card per GSTIN with its firm name and address.
function GstList({ gsts, onChange, businessName }) {
  const setRow = (i, k) => (e) => onChange(gsts.map((g, j) => (j === i ? { ...g, [k]: k === 'gstNumber' ? e.target.value.toUpperCase().replace(/\s/g, '') : e.target.value } : g)));
  return (
    <div className="space-y-2">
      {gsts.map((g, i) => {
        const state = stateOf(g.gstNumber);
        return (
          <div key={g._id || i} className="rounded-lg border border-zinc-200 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>GST {i + 1}{i === 0 && gsts.length > 1 ? ' (main)' : ''}{state && <span className="ml-2 font-normal text-zinc-400">{state}</span>}</span>
              <button type="button" onClick={() => onChange(gsts.filter((_, j) => j !== i))} title="Remove this GST" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={g.gstNumber} onChange={setRow(i, 'gstNumber')} placeholder="GSTIN e.g. 24ABCDE1234F1Z5" className="font-mono uppercase placeholder:font-sans placeholder:normal-case" maxLength={15} />
              <Input value={g.firmName} onChange={setRow(i, 'firmName')} placeholder={`Firm / trade name${businessName ? ` (e.g. ${businessName})` : ''}`} />
              <Input value={g.ownerName} onChange={setRow(i, 'ownerName')} placeholder="Owner / proprietor name (e.g. Bhavnaben Ghori)" />
              <Input value={g.address} onChange={setRow(i, 'address')} placeholder="Address of this GST (optional)" />
            </div>
          </div>
        );
      })}
      <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => onChange([...gsts, { ...EMPTY_GST, firmName: gsts.length ? '' : businessName }])}>
        {gsts.length ? 'Add another GST' : 'Add GST number'}
      </Button>
    </div>
  );
}

export default function CustomerFormModal({ open, onClose, customer, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState([]);
  const [refOpen, setRefOpen] = useState(false); // B2B partner suggestions under "Referred by"

  useEffect(() => {
    if (!open) return;
    const partner = customer?.referredByPartner;
    setForm(customer ? { ...EMPTY, ...customer, gsts: (customer.gsts || []).map((g) => ({ ...EMPTY_GST, ...g })), referredByPartner: partner?._id || '', referredBy: partner?._id ? partnerLabel(partner) : customer.referredBy || '' } : EMPTY);
    api.get('/b2b/options').then((r) => setPartners(r.data.data)).catch(() => setPartners([]));
  }, [open, customer]);

  // Keep an inactive partner already linked to this customer visible in the list.
  const linked = customer?.referredByPartner;
  const partnerOptions = linked?._id && !partners.some((p) => p._id === linked._id) ? [...partners, linked] : partners;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Typing a name unlinks any partner; picking a suggestion links that B2B partner.
  const refQuery = form.referredByPartner ? '' : form.referredBy.trim().toLowerCase();
  const refMatches = partnerOptions.filter((p) => partnerLabel(p).toLowerCase().includes(refQuery));

  const submit = async (e) => {
    e.preventDefault();
    const gsts = form.gsts.filter((g) => g.gstNumber || g.firmName.trim() || g.ownerName.trim() || g.address.trim());
    if (!/^\d{10}$/.test(form.phone)) return toast.error('Mobile number must be exactly 10 digits');
    const bad = gsts.find((g) => !GST_RE.test(g.gstNumber));
    if (bad) return toast.error(`GST number "${bad.gstNumber || bad.firmName}" looks wrong (15 characters, e.g. 24ABCDE1234F1Z5)`);
    const twice = gsts.find((g, i) => gsts.findIndex((x) => x.gstNumber === g.gstNumber) !== i);
    if (twice) return toast.error(`GST number ${twice.gstNumber} is added twice`);

    setSaving(true);
    try {
      const payload = {
        ...form,
        gsts,
        referredBy: form.referredByPartner ? '' : form.referredBy,
      };
      const { data } = customer
        ? await api.put(`/customers/${customer._id}`, payload)
        : await api.post('/customers', payload);
      toast.success(customer ? 'Customer updated' : 'Customer added');
      onSaved(data.customer);
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
      scroll
      title={customer ? 'Edit customer' : 'Add customer'}
      description={customer ? undefined : 'Add a converted lead as a new customer.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="customer-form" loading={saving}>{customer ? 'Save changes' : 'Add customer'}</Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" required className="sm:col-span-2">
          <Input required autoFocus value={form.businessName} onChange={set('businessName')} placeholder="e.g. Shree Ganesh Traders" />
        </Field>
        <Field label="Contact person">
          <Input value={form.contactPerson} onChange={set('contactPerson')} />
        </Field>
        <Field label="Mobile number" required>
          <Input
            required
            type="tel"
            inputMode="numeric"
            maxLength={10}
            pattern="\d{10}"
            title="Enter a 10 digit mobile number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="10 digit WhatsApp number"
          />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Referred by" hint={form.referredByPartner ? 'B2B partner' : undefined}>
          <div className="relative">
            <Input
              value={form.referredBy}
              onChange={(e) => { setForm({ ...form, referredBy: e.target.value, referredByPartner: '' }); setRefOpen(true); }}
              onFocus={() => setRefOpen(true)}
              onBlur={() => setRefOpen(false)}
              placeholder="Type a name or pick a B2B partner"
              autoComplete="off"
            />
            {refOpen && refMatches.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">B2B partners</div>
                {refMatches.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setForm({ ...form, referredBy: partnerLabel(p), referredByPartner: p._id }); setRefOpen(false); }}
                    className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-zinc-50 ${form.referredByPartner === p._id ? 'font-medium text-zinc-900' : 'text-zinc-700'}`}
                  >
                    {partnerLabel(p)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        <Field label="GST numbers" hint="Add every firm this customer pays for (own or family members’ GSTINs). Services and sales can then be billed to each firm, and one payment can cover all of them." className="sm:col-span-2">
          <GstList gsts={form.gsts} onChange={(gsts) => setForm({ ...form, gsts })} businessName={form.businessName} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Textarea rows={2} value={form.address} onChange={set('address')} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={2} value={form.notes} onChange={set('notes')} />
        </Field>
      </form>
    </Modal>
  );
}
