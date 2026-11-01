// Reading Excel / CSV files in the browser for the import dialogs, and writing sample CSVs.

export const toCsv = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\r\n');

export function downloadCsv(rows, fileName) {
  const blob = new Blob([`﻿${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: fileName });
  a.click();
  URL.revokeObjectURL(a.href);
}

// Small CSV reader: quoted fields, escaped quotes, commas and new lines inside quotes.
export function parseCsv(text) {
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

export async function readFile(file) {
  if (/\.csv$/i.test(file.name)) return parseCsv((await file.text()).replace(/^﻿/, ''));
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose an Excel (.xlsx) or CSV file. For old .xls files, open in Excel and “Save As” .xlsx first.');
  const { readSheet } = await import('read-excel-file/browser');
  return readSheet(file);
}

