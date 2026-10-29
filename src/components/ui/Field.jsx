import { fieldBase as base } from './fieldStyles';
import CustomSelect from './CustomSelect';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

export function Field({ label, hint, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-zinc-600">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

// Typed text starts with a capital letter. Left alone: non-text types (email, password, number…),
// search boxes, UPPERCASE fields (GST), and any field given `noCapitalize` (UPI IDs, keys, URLs).
const capitalizeFirst = (onChange) => (e) => {
  const el = e.target;
  const v = el.value;
  if (v && v[0] !== v[0].toUpperCase()) {
    const pos = el.selectionStart;
    el.value = v[0].toUpperCase() + v.slice(1);
    el.setSelectionRange?.(pos, pos);
  }
  onChange(e);
};
const shouldCapitalize = ({ type, placeholder, className = '', noCapitalize, onChange }) =>
  onChange && !noCapitalize && (!type || type === 'text') && !/^search/i.test(placeholder || '') && !/\buppercase\b/.test(className);

// Date, month and time fields use the app's own calendar / time picker.
export const Input = ({ className = '', noCapitalize, ...props }) => {
  if (props.type === 'date' || props.type === 'month') return <DatePicker className={className} {...props} />;
  if (props.type === 'time') return <TimePicker className={className} {...props} />;
  const onChange = shouldCapitalize({ ...props, className, noCapitalize }) ? capitalizeFirst(props.onChange) : props.onChange;
  return <input className={`${base} h-9 ${className}`} {...props} onChange={onChange} />;
};

export const Textarea = ({ className = '', noCapitalize, ...props }) => {
  const onChange = shouldCapitalize({ ...props, className, noCapitalize }) ? capitalizeFirst(props.onChange) : props.onChange;
  return <textarea className={`${base} py-2 min-h-20 resize-y ${className}`} {...props} onChange={onChange} />;
};

// Custom dropdown; takes the same props and <option> children as a native <select>.
export const Select = CustomSelect;
