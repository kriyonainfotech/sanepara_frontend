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

  // Branded "Scan & Pay" card to send to clients: SANEPARA logo, QR, amount to pay, UPI ID.
  const download = async () => {
    const img = new Image();
    img.src = qr.url;
    await img.decode();

    const W = 600, Q = 420, font = 'Inter, Arial, sans-serif';
    const note = f.note.trim();
    const H = 890 + (note ? 30 : 0);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'middle';

    // Logo: dark "S" tile + firm name (same as the sidebar brand)
    const logoX = W / 2 - 120, logoY = 36;
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, 60, 60, 14);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `700 30px ${font}`;
    ctx.fillText('S', logoX + 30, logoY + 32);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#18181b';
    ctx.font = `700 26px ${font}`;
    ctx.fillText('SANEPARA', logoX + 76, logoY + 20);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = `600 14px ${font}`;
    ctx.letterSpacing = '3px';
    ctx.fillText('AND COMPANY', logoX + 76, logoY + 46);
    ctx.letterSpacing = '0px';

    // "Scan & Pay" heading
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2554e8';
    ctx.font = `700 28px ${font}`;
    ctx.fillText('Scan & Pay', W / 2, 140);

    // QR inside a light border
    const qx = (W - Q) / 2, qy = 186;
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(qx - 16, qy - 16, Q + 32, Q + 32, 24);
    ctx.stroke();
    ctx.drawImage(img, qx, qy, Q, Q);

    // Amount to pay, payee, UPI ID, note
    let y = qy + Q + 56;
    ctx.fillStyle = '#71717a';
    ctx.font = `500 18px ${font}`;
    ctx.fillText('Amount to pay', W / 2, y);
    y += 44;
    ctx.fillStyle = '#18181b';
    ctx.font = `700 48px ${font}`;
    ctx.fillText(formatMoney(amount), W / 2, y);
    y += 52;
    ctx.fillStyle = '#3f3f46';
    ctx.font = `600 20px ${font}`;
    ctx.fillText(`Pay to: ${f.name.trim() || 'SANEPARA AND COMPANY'}`, W / 2, y);
    y += 32;
    ctx.fillText(`UPI ID: ${f.upiId.trim()}`, W / 2, y);
    if (note) { y += 30; ctx.fillStyle = '#71717a'; ctx.font = `400 18px ${font}`; ctx.fillText(note, W / 2, y); }
    y += 50;
    ctx.fillStyle = '#a1a1aa';
    ctx.font = `400 16px ${font}`;
    ctx.fillText('Pay using GPay, PhonePe, Paytm, BHIM or any UPI app', W / 2, y);

    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
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
