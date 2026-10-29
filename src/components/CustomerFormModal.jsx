import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Field, Input, Textarea } from './ui/Field';
import { api, errorMessage } from '../lib/api';

const EMPTY = { businessName: '', contactPerson: '', phone: '', email: '', gstNumber: '', address: '', referredBy: '', referredByPartner: '', notes: '' };
const partnerLabel = (p) => `${p.name}${p.firmName ? ` — ${p.firmName}` : ''}`;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function CustomerFormModal({ open, onClose, customer, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState([]);
  const [refOpen, setRefOpen] = useState(false); // B2B partner suggestions under "Referred by"

  useEffect(() => {
    if (!open) return;
    const partner = customer?.referredByPartner;
    setForm(customer ? { ...EMPTY, ...customer, referredByPartner: partner?._id || '', referredBy: partner?._id ? partnerLabel(partner) : customer.referredBy || '' } : EMPTY);
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
    const gst = form.gstNumber.trim().toUpperCase();
    if (!/^\d{10}$/.test(form.phone)) return toast.error('Mobile number must be exactly 10 digits');
    if (gst && !GST_RE.test(gst)) return toast.error('GST number format looks wrong (15 characters, e.g. 24ABCDE1234F1Z5)');

    setSaving(true);
    try {
      const payload = {
        ...form,
        gstNumber: gst,
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
        <Field label="GST number">
          <Input value={form.gstNumber} onChange={set('gstNumber')} placeholder="24ABCDE1234F1Z5" className="uppercase placeholder:normal-case" maxLength={15} />
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
