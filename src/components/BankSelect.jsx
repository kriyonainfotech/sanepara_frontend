import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Field, Select } from './ui/Field';

// Active bank / cash accounts, loaded once and shared by every form on the page.
let cache = null;
export const loadBankOptions = (fresh) => {
  if (fresh || !cache) cache = api.get('/banks/options').then((r) => r.data.data).catch(() => (cache = null, []));
  return cache;
};

export function useBankOptions() {
  const [banks, setBanks] = useState(null);
  useEffect(() => {
    let live = true;
    loadBankOptions().then((b) => live && setBanks(b));
    return () => { live = false; };
  }, []);
  return banks;
}

// Which account the money goes into / comes out of. An empty value shows (and the server
// saves) the first account — the default one. Hidden until at least one account exists.
export default function BankSelect({ value, onChange, label = 'Bank / Cash account', disabled, className }) {
  const banks = useBankOptions();
  if (!banks) return null;
  if (!banks.length) {
    return (
      <Field label={label} className={className}>
        <div className="flex h-9 items-center text-xs text-zinc-400">No accounts yet — <Link to="/banks" className="ml-1 text-zinc-700 underline">add in Bank &amp; Cash</Link></div>
      </Field>
    );
  }
  return (
    <Field label={label} className={className}>
      <Select value={value || banks[0]._id} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {banks.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
      </Select>
    </Field>
  );
}
