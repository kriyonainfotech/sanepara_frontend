import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Banknote, FileText, Printer, Search, Wallet } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, localToday, longDay, shortDay } from '../lib/format';
import { SALE_STATUS_TONE } from '../lib/sales';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import UpiQr from '../components/UpiQr';
import { Field, Input } from '../components/ui/Field';

// Opens the invoice alone in a new window with the app's styles and prints it.
function printNode(node, title) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return toast.error('Allow pop-ups to print the invoice');
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join('');
  w.document.write(`<!doctype html><html><head><title>${title}</title>${styles}<style>@page{margin:12mm}body{background:#fff}</style></head><body>${node.outerHTML}</body></html>`);
  w.document.close();
  // Wait for stylesheets / QR image; print once whichever comes first.
  let printed = false;
  const go = () => { if (printed || w.closed) return; printed = true; w.focus(); w.print(); };
  w.onload = go;
  setTimeout(go, 800);
}

function InvoiceDocument({ invoice, payments, firm }) {
  const sale = invoice.sale;
  const c = sale.customer || {};
  const rows = [
    sale.professionalFee > 0 && { label: sale.service?.name ? `${sale.service.name} — ${sale.title}` : sale.title, sub: 'Professional fee', amount: sale.professionalFee },
    sale.govtFee > 0 && { label: 'Government fee', sub: 'Paid to government on your behalf', amount: sale.govtFee },
  ].filter(Boolean);

  return (
    <div className="bg-white p-4 text-sm text-zinc-800 sm:p-8">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:gap-6">
        <div>
          <div className="text-xl font-bold tracking-tight text-zinc-900">{firm.name}</div>
          {firm.address && <div className="mt-1 max-w-xs whitespace-pre-line text-xs text-zinc-500">{firm.address}</div>}
          <div className="mt-1 text-xs text-zinc-500">{[firm.phone, firm.email].filter(Boolean).join(' · ')}</div>
          {firm.gstNumber && <div className="text-xs text-zinc-500">GSTIN: {firm.gstNumber}</div>}
        </div>
        <div className="sm:text-right">
          <div className="text-2xl font-bold tracking-tight text-zinc-900">INVOICE</div>
          <div className="mt-1 text-xs text-zinc-500">No. <b className="text-zinc-800">{invoice.invoiceNo}</b></div>
          <div className="text-xs text-zinc-500">Date: <b className="text-zinc-800">{longDay(invoice.invoiceDate)}</b></div>
          <div className="text-xs text-zinc-500">Sale ref: {sale.saleNo}</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bill to</div>
        <div className="mt-1 font-semibold text-zinc-900">{c.businessName}</div>
        {c.contactPerson && <div className="text-xs text-zinc-600">{c.contactPerson}</div>}
        {c.address && <div className="max-w-xs whitespace-pre-line text-xs text-zinc-600">{c.address}</div>}
        <div className="text-xs text-zinc-600">{[c.phone, c.email].filter(Boolean).join(' · ')}</div>
        {c.gstNumber && <div className="text-xs text-zinc-600">GSTIN: {c.gstNumber}</div>}
      </div>

      <table className="mt-6 w-full">
        <thead><tr className="border-y border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500"><th className="w-10 px-3 py-2 font-medium">#</th><th className="px-3 py-2 font-medium">Description</th><th className="px-3 py-2 text-right font-medium">Amount</th></tr></thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r, i) => (
            <tr key={i}><td className="px-3 py-2.5 align-top text-zinc-400">{i + 1}</td><td className="px-3 py-2.5"><div className="font-medium">{r.label}</div><div className="text-xs text-zinc-500">{r.sub}</div></td><td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(r.amount)}</td></tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="text-xs text-zinc-500">
          {payments.length > 0 && (
            <>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Payments received</div>
              {payments.map((p) => <div key={p._id}>{shortDay(p.date)} · {p.mode}{p.reference ? ` (${p.reference})` : ''} · {formatMoney(p.amount)}{p.discount ? ` + ${formatMoney(p.discount)} discount` : ''}</div>)}
            </>
          )}
        </div>
        <div className="w-full space-y-1 text-sm sm:w-64">
          <div className="flex justify-between"><span className="text-zinc-500">Total</span><b className="tabular-nums">{formatMoney(sale.totalAmount)}</b></div>
          <div className="flex justify-between"><span className="text-zinc-500">Received</span><span className="tabular-nums">{formatMoney(sale.receivedAmount)}</span></div>
          {sale.discountAmount > 0 && <div className="flex justify-between"><span className="text-zinc-500">Discount</span><span className="tabular-nums">{formatMoney(sale.discountAmount)}</span></div>}
          <div className="flex justify-between border-t border-zinc-200 pt-1.5 text-base"><span className="font-semibold">Balance due</span><b className="tabular-nums">{formatMoney(sale.balance)}</b></div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-zinc-200 pt-5 sm:flex-row sm:items-end sm:gap-6">
        <div className="max-w-sm text-xs text-zinc-500">
          {invoice.notes && <p className="mb-2 whitespace-pre-line text-zinc-700">{invoice.notes}</p>}
          {firm.invoiceTerms && <p className="whitespace-pre-line">{firm.invoiceTerms}</p>}
          <p className="mt-3 text-[10px] text-zinc-400">This is a computer generated invoice.</p>
        </div>
        {sale.balance > 0 && firm.upiId && (
          <div className="text-center">
            <UpiQr upiId={firm.upiId} name={firm.upiName || firm.name} amount={sale.balance} note={invoice.invoiceNo} size={110} />
            <div className="mt-1 text-[10px] text-zinc-500">Scan to pay {formatMoney(sale.balance)}</div>
            <div className="text-[10px] text-zinc-400">{firm.upiId}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function InvoiceView({ invoiceId, onClose, onChanged }) {
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);
  const load = useCallback(() => api.get(`/invoices/${invoiceId}`).then((r) => { setData(r.data); setF({ invoiceDate: r.data.data.invoiceDate, notes: r.data.data.notes || '' }); }), [invoiceId]);
  useEffect(() => { setData(null); if (invoiceId) load().catch((e) => toast.error(errorMessage(e))); }, [invoiceId, load]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: res } = await api.put(`/invoices/${invoiceId}`, f);
      toast.success(res.message);
      load(); onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!invoiceId} onClose={onClose} size="lg" title={data ? `Invoice ${data.data.invoiceNo}` : 'Invoice'}
      footer={data && <><Button variant="secondary" onClick={onClose}>Close</Button><Button icon={Printer} onClick={() => printNode(ref.current, data.data.invoiceNo)}>Print / Save PDF</Button></>}>
      {!data ? <Spinner /> : (
        <div className="space-y-4">
          {!data.firm.address && !data.firm.phone && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Add your firm address, GSTIN and UPI ID in Settings → Firm Details to show them on invoices.</p>}
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-zinc-200"><div ref={ref}><InvoiceDocument invoice={data.data} payments={data.payments} firm={data.firm} /></div></div>
          {can('invoices', 'create') && (
            <div className="flex flex-wrap items-end gap-3 rounded-lg bg-zinc-50 p-3">
              <Field label="Invoice date" className="w-44"><Input type="date" value={f.invoiceDate} onChange={(e) => setF({ ...f, invoiceDate: e.target.value })} /></Field>
              <Field label="Note on invoice" className="min-w-48 flex-1"><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional" /></Field>
              <Button variant="secondary" onClick={save} loading={saving}>Save</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Invoices() {
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [viewing, setViewing] = useState(null);

  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t); }, [search]);
  const load = useCallback(() => api.get('/invoices', { params: { ...(month && { month }), ...(q && { search: q }) } }).then((r) => setData(r.data)), [month, q]);
  useEffect(() => { setData(null); load(); }, [load]);

  const s = data?.stats;
  return (
    <div>
      <PageHeader title="Invoices" description="Every sale gets an invoice automatically. Open one to print or save it as PDF."
        actions={<div className="w-44"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>} />
      {s && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Invoices" value={s.count} icon={FileText} />
          <StatCard label="Invoiced" value={formatMoney(s.total)} icon={FileText} tone="blue" />
          <StatCard label="Received" value={formatMoney(s.received)} icon={Banknote} tone="green" />
          <StatCard label="Balance due" value={formatMoney(s.balance)} icon={Wallet} tone="rose" />
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice no, customer, work…" className="pl-9" />
        </div>
        {month && <Button variant="ghost" size="sm" onClick={() => setMonth('')}>Show all months</Button>}
      </div>
      <Card className="overflow-hidden">
        {!data ? <Spinner /> : data.data.length === 0 ? (
          <EmptyState icon={FileText} title="No invoices" message="Invoices are created automatically for every sale." />
        ) : (
          <>
          {/* Phones & tablets: cards */}
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
            {data.data.map((i) => (
              <button key={i._id} type="button" onClick={() => setViewing(i._id)} className="flex flex-col rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50/60">
                <div className="flex w-full items-start justify-between gap-3">
                  <div><div className="font-medium">{i.invoiceNo}</div><div className="text-xs text-zinc-500">{shortDay(i.invoiceDate)}</div></div>
                  <Badge tone={SALE_STATUS_TONE[i.sale?.status]}>{i.sale?.status}</Badge>
                </div>
                <div className="mt-2 font-medium">{i.sale?.customer?.businessName}</div>
                <div className="text-xs text-zinc-500">{i.sale?.saleNo} · {i.sale?.title}</div>
                <div className="mt-3 grid w-full grid-cols-2 gap-2 text-center tabular-nums">
                  <div className="rounded-lg bg-zinc-50 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">Amount</div><div className="font-semibold">{formatMoney(i.sale?.totalAmount)}</div></div>
                  <div className="rounded-lg bg-zinc-50 py-2"><div className="text-[10px] font-semibold uppercase text-zinc-400">Balance</div><div className={`font-semibold ${i.sale?.balance > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>{formatMoney(i.sale?.balance)}</div></div>
                </div>
              </button>
            ))}
          </div>

          {/* Laptop and up: table */}
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs text-zinc-500">
              <th className="px-5 py-2.5 font-medium">Invoice</th><th className="px-3 py-2.5 font-medium">Customer / Work</th><th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-3 py-2.5 text-right font-medium">Balance</th><th className="px-3 py-2.5 font-medium">Payment</th><th className="px-5 py-2.5" />
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {data.data.map((i) => (
                <tr key={i._id} className="cursor-pointer hover:bg-zinc-50/60" onClick={() => setViewing(i._id)}>
                  <td className="px-5 py-3"><div className="font-medium">{i.invoiceNo}</div><div className="text-xs text-zinc-500">{shortDay(i.invoiceDate)}</div></td>
                  <td className="px-3 py-3"><div className="font-medium">{i.sale?.customer?.businessName}</div><div className="text-xs text-zinc-500">{i.sale?.saleNo} · {i.sale?.title}</div></td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatMoney(i.sale?.totalAmount)}</td>
                  <td className={`px-3 py-3 text-right font-semibold tabular-nums ${i.sale?.balance > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>{formatMoney(i.sale?.balance)}</td>
                  <td className="px-3 py-3"><Badge tone={SALE_STATUS_TONE[i.sale?.status]}>{i.sale?.status}</Badge></td>
                  <td className="px-5 py-3 text-right"><Button size="sm" variant="secondary" icon={Printer}>Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          </>
        )}
      </Card>
      <InvoiceView invoiceId={viewing} onClose={() => setViewing(null)} onChanged={load} />
    </div>
  );
}
