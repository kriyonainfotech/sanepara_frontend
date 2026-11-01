import { Field, Select } from './ui/Field';

// Which of the customer's firms (GST registrations) a service / sale is for. Shown only when the
// customer has firms; '' = the customer itself.
export default function FirmSelect({ gsts = [], value, onChange, customerName, disabled, hint, className }) {
  if (!gsts.length) return null;
  return (
    <Field label="For firm" hint={hint ?? 'Billed in this firm’s name; payment still comes from the customer.'} className={className}>
      <Select value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">{customerName ? `${customerName} (no firm)` : 'No firm'}</option>
        {gsts.map((g) => (
          <option key={g.gstNumber} value={g.gstNumber}>
            {[g.firmName || g.gstNumber, g.ownerName && `(${g.ownerName})`].filter(Boolean).join(' ')} · {g.gstNumber}
          </option>
        ))}
      </Select>
    </Field>
  );
}
