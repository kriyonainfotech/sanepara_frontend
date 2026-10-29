import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../lib/api';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import UpiQr from '../components/UpiQr';
import { Field, Input, Textarea } from '../components/ui/Field';

export default function FirmSettings() {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get('/settings/firm').then((r) => setF(r.data.data)); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/settings/firm', f);
      setF(data.data);
      toast.success(data.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Firm Details" description="Printed on every invoice. The UPI ID is used for the invoice QR and as the default in Payment QR." />
      {!f ? <Spinner /> : (
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          <Card className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Firm name" required className="sm:col-span-2"><Input required value={f.name} onChange={set('name')} /></Field>
            <Field label="Address" className="sm:col-span-2"><Textarea rows={3} value={f.address} onChange={set('address')} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Email"><Input type="email" value={f.email} onChange={set('email')} /></Field>
            <Field label="GSTIN"><Input value={f.gstNumber} onChange={set('gstNumber')} className="uppercase" /></Field>
            <div />
            <Field label="UPI ID" hint="e.g. sanepara@okaxis"><Input value={f.upiId} onChange={set('upiId')} /></Field>
            <Field label="UPI payee name"><Input value={f.upiName} onChange={set('upiName')} placeholder={f.name} /></Field>
            <Field label="Invoice terms / footer" className="sm:col-span-2"><Textarea rows={3} value={f.invoiceTerms} onChange={set('invoiceTerms')} /></Field>
            <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save</Button></div>
          </Card>
          <Card className="flex h-fit flex-col items-center p-6 text-center">
            {f.upiId ? (
              <>
                <UpiQr upiId={f.upiId} name={f.upiName || f.name} size={180} />
                <div className="mt-2 text-xs text-zinc-500">QR without amount — customer enters it</div>
              </>
            ) : <div className="py-8 text-sm text-zinc-400">Add a UPI ID to preview the QR</div>}
          </Card>
        </form>
      )}
    </div>
  );
}
