import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { api, errorMessage } from '../lib/api';

// Sheet column headings we understand, compared without case, spaces or punctuation.
const COLUMNS = {
  businessName: ['businessname', 'business', 'firmname', 'firm', 'companyname', 'company', 'name', 'clientname', 'client', 'tradename', 'partyname', 'party'],
  contactPerson: ['contactperson', 'contact', 'contactname', 'ownername', 'owner', 'person'],
  phone: ['mobile', 'mobileno', 'mobilenumber', 'phone', 'phoneno', 'phonenumber', 'whatsapp', 'whatsappno', 'whatsappnumber', 'contactno', 'contactnumber', 'number', 'mob'],
  gstNumber: ['gstnumber', 'gst', 'gstin', 'gstno', 'gstinno', 'gstinnumber'],
  email: ['email', 'emailid', 'mail'],
  address: ['address', 'addr', 'city'],
  notes: ['notes', 'note', 'remarks', 'remark'],
  gstFiling: ['gstfiling', 'filing', 'returntype', 'gstreturn', 'gstreturntype', 'gstfilingtype'],
};
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const SAMPLE = [
  ['Business Name', 'Contact Person', 'Mobile', 'GST Number', 'Email', 'Address', 'Notes', 'GST Filing'],
  ['Shree Ganesh Traders', 'Ramesh Patel', '9825012345', '24ABCDE1234F1Z5', 'ganesh@example.com', 'Ring Road, Surat', '', 'Monthly'],
  ['Krishna Textiles', 'Mahesh Shah', '9876543210', '', '', 'Varachha, Surat', 'ITR only', ''],
];

const toCsv = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\r\n');

function downloadSample() {
  const blob = new Blob([`﻿${toCsv(SAMPLE)}`], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'customers-import-sample.csv' });
  a.click();
  URL.revokeObjectURL(a.href);
}

// Small CSV reader: quoted fields, escaped quotes, commas and new lines inside quotes.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function readFile(file) {
  if (/\.csv$/i.test(file.name)) return parseCsv((await file.text()).replace(/^﻿/, ''));
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose an Excel (.xlsx) or CSV file. For old .xls files, open in Excel and “Save As” .xlsx first.');
  const { readSheet } = await import('read-excel-file/browser');
  return readSheet(file);
}

// Sheet rows → customer rows, using the first row that has a business name column as headings.
function toCustomers(sheet) {
  const headerAt = sheet.findIndex((r) => r.some((c) => COLUMNS.businessName.includes(norm(c))));
  if (headerAt < 0) throw new Error('Could not find a “Business Name” column. Use the sample file’s headings.');
  const index = {};
  sheet[headerAt].forEach((c, i) => {
    const key = Object.keys(COLUMNS).find((k) => COLUMNS[k].includes(norm(c)));
    if (key && index[key] === undefined) index[key] = i;
  });
  if (index.phone === undefined) throw new Error('Could not find a “Mobile” column. Use the sample file’s headings.');
  return sheet
    .slice(headerAt + 1)
    .map((r, i) => ({ row: headerAt + i + 2, ...Object.fromEntries(Object.entries(index).map(([k, col]) => [k, r[col] == null ? '' : String(r[col]).trim()])) }))
    .filter((r) => Object.keys(index).some((k) => r[k]));
}

const STATUS = {
  ok: { tone: 'green', label: 'Will import', icon: CheckCircle2 },
  duplicate: { tone: 'amber', label: 'Already exists', icon: AlertTriangle },
  error: { tone: 'red', label: 'Has a problem', icon: XCircle },
};

export default function ImportCustomersModal({ open, onClose, onImported }) {
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
      const customers = toCustomers(await readFile(file));
      if (!customers.length) throw new Error('The file has no customer rows under the headings');
      const { data } = await api.post('/customers/import', { rows: customers, dryRun: true });
      setFileName(file.name); setRows(customers); setCheck(data);
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
      const { data } = await api.post('/customers/import', { rows });
      toast.success(data.message);
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

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Import customers from Excel" description="Bring in your existing clients in one go. Nothing is saved until you press Import." footer={
      check ? (
        <>
          <Button variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()} disabled={busy}>Choose another file</Button>
          <Button onClick={doImport} loading={busy} disabled={!check.counts.ok}>Import {check.counts.ok} customer{check.counts.ok === 1 ? '' : 's'}</Button>
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
              <Button size="sm" variant="secondary" icon={Download} onClick={downloadSample}>Sample file</Button>
            </div>
            <b>Business Name</b> and <b>Mobile</b> (10 digits) are required. Optional: Contact Person, GST Number, Email, Address, Notes.
            <br /><b>GST Filing</b> (optional): <i>Monthly</i>, <i>Quarterly</i> or <i>Composition</i> also adds the customer to Running GST Filing from today.
            <br />Customers already in the CRM (same GST number, or same business name and mobile) are skipped.
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 truncate font-medium text-zinc-700">{fileName}</span>
            <Badge tone="green">{check.counts.ok} to import</Badge>
            {check.counts.duplicate > 0 && <Badge tone="amber">{check.counts.duplicate} already exist</Badge>}
            {check.counts.error > 0 && <Badge tone="red">{check.counts.error} with problems</Badge>}
          </div>
          {check.counts.error > 0 && <p className="mb-3 text-xs text-zinc-500">Rows with problems are left out. Fix them in the sheet and import that file again later — rows already imported will be skipped.</p>}
          <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-50 text-left text-zinc-500">
                <tr><th className="px-3 py-2 font-medium">Row</th><th className="px-3 py-2 font-medium">Business</th><th className="px-3 py-2 font-medium">Mobile</th><th className="px-3 py-2 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {results.map((r) => {
                  const st = STATUS[r.status];
                  return (
                    <tr key={r.row}>
                      <td className="px-3 py-2 tabular-nums text-zinc-400">{r.row}</td>
                      <td className="px-3 py-2"><div className="font-medium text-zinc-800">{r.businessName || <span className="text-zinc-400">—</span>}</div>{r.gstNumber && <div className="font-mono text-[11px] text-zinc-500">{r.gstNumber}</div>}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-600">{r.phone || '—'}</td>
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
