import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { api, errorMessage } from '../../lib/api';
import { formatMoney, shortDay } from '../../lib/format';
import { downloadCsv, readFile } from '../../lib/sheet';

// Sheet column headings we understand, compared without case, spaces or punctuation.
const COLUMNS = {
  date: ['date', 'paymentdate', 'receiveddate', 'dt'],
  amount: ['amount', 'amt', 'received', 'receivedamount', 'total', 'fee', 'fees'],
  mode: ['mode', 'paymentmode', 'paymode', 'modeofpayment', 'via', 'account'],
  srNo: ['srno', 'sr', 'srnumber', 'serialno', 'serial', 'receiptno', 'receipt', 'billno', 'no'],
  name: ['name', 'customer', 'customername', 'client', 'clientname', 'party', 'partyname', 'businessname'],
  service: ['service', 'servicename', 'work', 'particular', 'particulars', 'description'],
  partner: ['partnername', 'partner', 'referredby', 'reference', 'ref', 'refby', 'b2b', 'b2bpartner', 'agent'],
  phone: ['mobile', 'mobileno', 'mobilenumber', 'phone', 'phoneno', 'whatsapp', 'contactno', 'mob'],
  govtFee: ['govtfee', 'governmentfee', 'govt', 'govfee', 'challan'],
};
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const SAMPLE = [
  ['Date', 'Amount', 'Mode', 'Sr No', 'Name', 'Service', 'Partner Name', 'Mobile', 'Govt Fee'],
  ['30/10/2026', '350', 'Cash', '1458', 'Amit Bavadiya', 'Affidavit', 'Self', '9825012345', ''],
  ['29/10/2026', '6500', 'UPI', '1460', 'Jaldeep Patel', 'Trademark', 'Ramesh Rupapara', '', '4500'],
];

// Excel date cells arrive as Date objects (midnight UTC).
const cell = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? '' : String(v).trim());

// Sheet rows → collection rows, using the first row with a name and an amount column as headings.
function toRows(sheet) {
  const headerAt = sheet.findIndex((r) => r.some((c) => COLUMNS.name.includes(norm(c))) && r.some((c) => COLUMNS.amount.includes(norm(c))));
  if (headerAt < 0) throw new Error('Could not find the “Name” and “Amount” columns. Use the sample file’s headings.');
  const index = {};
  sheet[headerAt].forEach((c, i) => {
    const key = Object.keys(COLUMNS).find((k) => COLUMNS[k].includes(norm(c)));
    if (key && index[key] === undefined) index[key] = i;
  });
  for (const [k, label] of [['date', 'Date'], ['service', 'Service']]) if (index[k] === undefined) throw new Error(`Could not find a “${label}” column. Use the sample file’s headings.`);
  return sheet
    .slice(headerAt + 1)
    .map((r, i) => ({ row: headerAt + i + 2, ...Object.fromEntries(Object.entries(index).map(([k, col]) => [k, cell(r[col])])) }))
    .filter((r) => Object.keys(index).some((k) => r[k]));
}

const STATUS = {
  ok: { tone: 'green', label: 'Will import', icon: CheckCircle2 },
  duplicate: { tone: 'amber', label: 'Already in CRM', icon: AlertTriangle },
  error: { tone: 'red', label: 'Has a problem', icon: XCircle },
};

export default function ImportCollectionModal({ open, onClose, onImported }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState(null);
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setFileName(''); setRows(null); setCheck(null); }
  }, [open]);

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const list = toRows(await readFile(file));
      if (!list.length) throw new Error('The file has no rows under the headings');
      const { data } = await api.post('/sales/import', { rows: list, dryRun: true });
      setFileName(file.name); setRows(list); setCheck(data);
    } catch (err) {
      toast.error(err.response ? errorMessage(err) : err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/sales/import', { rows });
      toast.success(data.message, { duration: 6000 });
      onImported();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Problems first, so they are easy to fix in the sheet.
  const results = check ? [...check.results].sort((a, b) => (a.status === 'ok') - (b.status === 'ok') || a.row - b.row) : [];
  const okTotal = results.filter((r) => r.status === 'ok').reduce((a, r) => a + r.amount, 0);

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Import collection from Excel" description="Each row becomes a sale and its payment. Nothing is saved until you press Import." footer={
      check ? (
        <>
          <Button variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()} disabled={busy}>Choose another file</Button>
          <Button onClick={doImport} loading={busy} disabled={!check.counts.ok}>Import {check.counts.ok} payment{check.counts.ok === 1 ? '' : 's'}</Button>
        </>
      ) : (
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      )
    }>
      <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => pick(e.target.files[0])} />
      {!check ? (
        <div className="space-y-4">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 px-6 py-10 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-60">
            <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
            <span className="text-sm font-medium text-zinc-900">{busy ? 'Reading file…' : 'Choose Excel (.xlsx) or CSV file'}</span>
            <span className="text-xs text-zinc-500">First row must be the column headings</span>
          </button>
          <div className="rounded-lg bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-600">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-semibold text-zinc-800">Columns</span>
              <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadCsv(SAMPLE, 'collection-import-sample.csv')}>Sample file</Button>
            </div>
            <b>Date</b> (DD/MM/YYYY), <b>Amount</b>, <b>Name</b> and <b>Service</b> are required. Optional: Mode, Sr No, Partner Name, Mobile, Govt Fee.
            <br /><b>Name</b> is matched with the customer’s business name or contact person. A customer not in the CRM is created only if the row has a <b>Mobile</b>.
            <br /><b>Mode</b>: Cash, UPI, Bank, Cheque, or the name of a Bank &amp; Cash account (e.g. TGPAY). Add that account in Bank &amp; Cash first.
            <br /><b>Partner Name</b>: a B2B partner’s name links that partner (commission is worked out). <i>Self</i> or empty = no partner. Any other name is saved as “Referred by”.
            <br /><b>Govt Fee</b>: part of the amount that is government fee. Without it, the whole amount is professional fee.
            <br />Rows already in the CRM (same customer, date, amount, Sr No and service) are skipped, so the same file can be imported again safely.
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 truncate font-medium text-zinc-700">{fileName}</span>
            <Badge tone="green">{check.counts.ok} to import · {formatMoney(okTotal)}</Badge>
            {check.counts.duplicate > 0 && <Badge tone="amber">{check.counts.duplicate} already in CRM</Badge>}
            {check.counts.error > 0 && <Badge tone="red">{check.counts.error} with problems</Badge>}
          </div>
          {check.counts.error > 0 && <p className="mb-3 text-xs text-zinc-500">Rows with problems are left out. Fix them in the sheet and import the file again later — rows already imported will be skipped.</p>}
          <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-50 text-left text-zinc-500">
                <tr><th className="px-3 py-2 font-medium">Row</th><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Name · Service</th><th className="px-3 py-2 text-right font-medium">Amount</th><th className="px-3 py-2 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {results.map((r) => {
                  const st = STATUS[r.status];
                  return (
                    <tr key={r.row}>
                      <td className="px-3 py-2 tabular-nums text-zinc-400">{r.row}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{r.date ? shortDay(r.date) : '—'}</td>
                      <td className="px-3 py-2"><div className="font-medium text-zinc-800">{r.name || <span className="text-zinc-400">—</span>}</div><div className="text-[11px] text-zinc-500">{[r.srNo && `Sr ${r.srNo}`, r.service].filter(Boolean).join(' · ')}</div></td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.amount ? formatMoney(r.amount) : '—'}</td>
                      <td className="px-3 py-2"><Badge tone={st.tone}><st.icon className="h-3 w-3" />{st.label}</Badge>{r.message && <div className="mt-0.5 text-[11px] text-zinc-500">{r.message}</div>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
