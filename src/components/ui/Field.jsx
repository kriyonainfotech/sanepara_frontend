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

// Date, month and time fields use the app's own calendar / time picker.
export const Input = ({ className = '', ...props }) => {
  if (props.type === 'date' || props.type === 'month') return <DatePicker className={className} {...props} />;
  if (props.type === 'time') return <TimePicker className={className} {...props} />;
  return <input className={`${base} h-9 ${className}`} {...props} />;
};

export const Textarea = ({ className = '', ...props }) => (
  <textarea className={`${base} py-2 min-h-20 resize-y ${className}`} {...props} />
);

// Custom dropdown; takes the same props and <option> children as a native <select>.
export const Select = CustomSelect;
