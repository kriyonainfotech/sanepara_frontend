import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BookText, HandCoins, Plus, Undo2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, shortDay } from '../../lib/format';
import { SALE_STATUS_TONE } from '../../lib/sales';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import SaleDialog from './SaleDialog';
import SaleDetail from './SaleDetail';
import ReceivePaymentDialog from './ReceivePaymentDialog';
import ConfirmDialog from '../ui/ConfirmDialog';

// Firm a sale / payment part is billed to, as a small line.
const FirmLine = ({ x }) => (x.firmName || x.gstNumber ? <span className="text-blue-700">{x.firmName || x.gstNumber}{x.ownerName ? ` (${x.ownerName})` : ''}</span> : null);

// What a receipt paid: "S-0001 Lazuri ₹500 · S-0002 Glossmine ₹300".
const Parts = ({ e }) => (e.parts?.length > 1 || e.receipt ? (
  <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-zinc-500">
    {e.parts.map((p) => <span key={p.paymentId}><span className="font-mono">{p.saleNo}</span>{p.firmName ? ` ${p.firmName}` : ''} {formatMoney(p.amount + p.discount)}</span>)}
  </div>
) : null);

// Firm-wise account of a customer who pays for several firms.
function FirmTotals({ firms }) {
  if (!firms?.length || (firms.length === 1 && !firms[0].gstNumber)) return null;
  return (
    <div className="overflow-x-auto border-b border-zinc-100">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
          <tr><th className="px-4 py-2 font-medium">Firm</th><th className="px-3 py-2 text-right font-medium">Billed</th><th className="px-3 py-2 text-right font-medium">Received</th><th className="px-4 py-2 text-right font-medium">Outstanding</th></tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {firms.map((f) => (
            <tr key={f.gstNumber || 'self'}>
              <td className="px-4 py-2">
                <div className="font-medium">{f.firmName || f.gstNumber}{f.ownerName && <span className="font-normal text-zinc-500"> · {f.ownerName}</span>}</div>
                <div className="font-mono text-[11px] text-zinc-400">{f.gstNumber || 'No firm'}{f.sales ? <span className="font-sans"> · {f.sales} sale{f.sales === 1 ? '' : 's'}</span> : ''}</div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(f.billed)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{formatMoney(f.received)}</td>
              <td className={`px-4 py-2 text-right font-semibold tabular-nums ${f.outstanding > 0 ? 'text-rose-600' : 'text-zinc-500'}`}>{formatMoney(f.outstanding)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Customer's account: totals and the ledger (sales debit, payments credit, running balance).
export default function CustomerAccount({ customerId, refreshKey, onChanged }) {
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [openSale, setOpenSale] = useState(null);
  const [receiving, setReceiving] = useState(false);
  const [undoing, setUndoing] = useState(null); // receipt no.
  const canCollect = can('sales', 'collect') || can('sales', 'edit');

  const load = useCallback(() => api.get(`/customers/${customerId}/ledger`).then((r) => setData(r.data)), [customerId]);
  useEffect(() => { load(); }, [load, refreshKey]);
  const changed = () => { load(); onChanged?.(); };
  const undoReceipt = async () => {
    try {
      const { data: r } = await api.delete(`/sales/receipts/${undoing}`);
      toast.success(r.message);
      setUndoing(null); changed();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const t = data?.totals;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><BookText className="h-4 w-4" /> Account & Ledger</h2>
        <div className="flex gap-2">
          {canCollect && t?.outstanding > 0 && <Button size="sm" variant="secondary" icon={HandCoins} onClick={() => setReceiving(true)}>Receive payment</Button>}
          {can('sales', 'create') && <Button size="sm" icon={Plus} onClick={() => setNewOpen(true)}>New sale</Button>}
        </div>
      </div>
      {!data ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 gap-px bg-zinc-100 sm:grid-cols-5">
            {[['Billed', t.billed], ['Professional', t.professional], ['Govt fee', t.govt], ['Received', t.received], ['Outstanding', t.outstanding]].map(([l, v]) => (
              <div key={l} className="bg-white px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{l}</div>
                <div className={`text-base font-semibold tabular-nums ${l === 'Outstanding' && v > 0 ? 'text-rose-600' : l === 'Received' ? 'text-emerald-700' : ''}`}>{formatMoney(v)}</div>
              </div>
            ))}
          </div>
          <FirmTotals firms={data.firms} />
          {data.entries.length === 0 ? (
            <EmptyState icon={BookText} title="No sales yet" message="Sales and payments for this customer appear here as a running account." />
          ) : (
            <>
            <ul className="max-h-[32rem] divide-y divide-zinc-100 overflow-y-auto lg:hidden">
              {data.entries.map((e, i) => (
                <li key={i} onClick={() => e.saleId && setOpenSale(e.saleId)} className="cursor-pointer px-4 py-3 text-sm hover:bg-zinc-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {e.type === 'sale' ? (
                        <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{e.title}</span><Badge tone={SALE_STATUS_TONE[e.status]}>{e.status}</Badge></div>
                      ) : <div className="text-emerald-700">{e.title}</div>}
                      {e.type === 'sale' && <div className="text-xs"><FirmLine x={e} /></div>}
                      <div className="text-xs text-zinc-500">
                        {shortDay(e.date)} · <span className="font-mono">{e.ref}</span>
                        {e.type === 'sale' ? ` · prof. ${formatMoney(e.professionalFee)} + govt ${formatMoney(e.govtFee)}` : `${e.discount > 0 && e.amount > 0 ? ` · incl. ${formatMoney(e.discount)} discount` : ''}${e.note ? ` · ${e.note}` : ''}`}
                      </div>
                      {e.type === 'payment' && <Parts e={e} />}
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      {e.debit ? <div>{formatMoney(e.debit)} <span className="text-[10px] text-zinc-400">Dr</span></div> : null}
                      {e.credit ? <div className="text-emerald-700">{formatMoney(e.credit)} <span className="text-[10px] text-zinc-400">Cr</span></div> : null}
                      <div className={`text-xs font-semibold ${e.balance > 0 ? 'text-rose-600' : 'text-zinc-500'}`}>Bal {formatMoney(e.balance)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden max-h-96 overflow-auto lg:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-left text-xs text-zinc-500">
                  <tr><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Particulars</th><th className="px-3 py-2 text-right font-medium">Debit</th><th className="px-3 py-2 text-right font-medium">Credit</th><th className="px-4 py-2 text-right font-medium">Balance</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.entries.map((e, i) => (
                    <tr key={i} onClick={() => e.saleId && setOpenSale(e.saleId)} className="cursor-pointer hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">{shortDay(e.date)}</td>
                      <td className="px-4 py-2">
                        {e.type === 'sale' ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{e.title}</span><Badge tone={SALE_STATUS_TONE[e.status]}>{e.status}</Badge></div>
                            <div className="text-xs text-zinc-500"><span className="font-mono">{e.ref}</span>{(e.firmName || e.gstNumber) && <> · <FirmLine x={e} /></>} · prof. {formatMoney(e.professionalFee)} + govt {formatMoney(e.govtFee)}</div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-emerald-700">{e.title}
                              {e.receipt && canCollect && <button onClick={(ev) => { ev.stopPropagation(); setUndoing(e.receipt); }} title="Remove this receipt" className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"><Undo2 className="h-3.5 w-3.5" /></button>}
                            </div>
                            <div className="text-xs text-zinc-500">{e.receipt ? <>Receipt <span className="font-mono">{e.receipt}</span></> : <>against <span className="font-mono">{e.ref}</span></>}{e.discount > 0 && e.amount > 0 ? ` · incl. ${formatMoney(e.discount)} discount` : ''}{e.note ? ` · ${e.note}` : ''}</div>
                            <Parts e={e} />
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.debit ? formatMoney(e.debit) : ''}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{e.credit ? formatMoney(e.credit) : ''}</td>
                      <td className={`px-4 py-2 text-right font-semibold tabular-nums ${e.balance > 0 ? 'text-rose-600' : 'text-zinc-500'}`}>{formatMoney(e.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </>
      )}
      <SaleDialog open={newOpen} onClose={() => setNewOpen(false)} preset={{ customer: customerId }} onSaved={changed} />
      <SaleDetail saleId={openSale} onClose={() => setOpenSale(null)} onChanged={changed} />
      <ReceivePaymentDialog open={receiving} customerId={customerId} customerName={data?.customer?.businessName} sales={data?.sales} onClose={() => setReceiving(false)} onDone={changed} />
      <ConfirmDialog open={!!undoing} onClose={() => setUndoing(null)} onConfirm={undoReceipt} title="Remove receipt?" message={`Receipt ${undoing} and its share in every sale will be removed.`} confirmText="Remove" />
    </Card>
  );
}
