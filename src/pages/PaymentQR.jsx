import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Download, QrCode } from 'lucide-react';
import { api } from '../lib/api';
import { formatMoney } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import UpiQr, { isUpiId } from '../components/UpiQr';
import { Field, Input } from '../components/ui/Field';

export default function PaymentQR() {
  const [f, setF] = useState({ upiId: '', name: '', amount: '', note: '' });
  const [qr, setQr] = useState(null);
  useEffect(() => {
    api.get('/settings/firm').then((r) => setF((x) => ({ ...x, upiId: x.upiId || r.data.data.upiId || '', name: x.name || r.data.data.upiName || r.data.data.name || '' })));
  }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onReady = useCallback((url, link) => setQr({ url, link }), []);
  const valid = isUpiId(f.upiId);
  const amount = Number(f.amount) > 0 ? Number(f.amount) : 0;

  const download = () => {
    const a = document.createElement('a');
    a.href = qr.url;
    a.download = `UPI-QR-${amount || 'any'}.png`;
    a.click();
  };
  const copy = async () => {
    await navigator.clipboard.writeText(qr.link);
    toast.success('Payment link copied');
  };

  return (
    <div>
      <PageHeader title="Payment QR" description="Enter the UPI ID and amount — a UPI QR for that exact amount is generated instantly. Works with GPay, PhonePe, Paytm and every UPI app." />
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="UPI ID" required hint={f.upiId && !valid ? 'Looks incomplete — e.g. name@okaxis' : 'Default comes from Settings → Firm Details'}>
              <Input noCapitalize value={f.upiId} onChange={set('upiId')} placeholder="yourname@bank" />
            </Field>
            <Field label="Payee name"><Input value={f.name} onChange={set('name')} placeholder="Shown in the payer's app" /></Field>
            <Field label="Amount (₹)" required>
              <Input type="number" min="1" step="any" autoFocus value={f.amount} onChange={set('amount')} placeholder="e.g. 1500" className="text-lg font-semibold" />
            </Field>
            <Field label="Note"><Input value={f.note} onChange={set('note')} placeholder="e.g. GST filing Oct" maxLength={80} /></Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[500, 1000, 1500, 2000, 5000].map((v) => (
              <button key={v} onClick={() => setF({ ...f, amount: String(v) })} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">{formatMoney(v)}</button>
            ))}
          </div>
        </Card>

        <Card className="flex w-full flex-col items-center justify-center p-6 lg:w-80">
          {valid && amount ? (
            <>
              <div className="rounded-2xl border border-zinc-200 p-3"><UpiQr upiId={f.upiId} name={f.name} amount={amount} note={f.note} size={220} onReady={onReady} /></div>
              <div className="mt-3 text-2xl font-semibold tabular-nums">{formatMoney(amount)}</div>
              <div className="text-xs text-zinc-500">to {f.name || f.upiId}</div>
              <div className="text-[11px] text-zinc-400">{f.upiId}</div>
              {qr && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" icon={Download} onClick={download}>Download</Button>
                  <Button size="sm" variant="secondary" icon={Copy} onClick={copy}>Copy link</Button>
                </div>
              )}
            </>
          ) : (
            <div className="py-10 text-center text-sm text-zinc-400">
              <QrCode className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              Enter a UPI ID and amount
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
