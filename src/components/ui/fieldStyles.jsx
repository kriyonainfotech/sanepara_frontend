export const fieldBase =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-shadow focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:bg-zinc-50';

// Same look as an input, for the button that opens a custom dropdown / calendar.
export const triggerBase = `${fieldBase} flex h-9 items-center gap-2 text-left disabled:cursor-not-allowed disabled:text-zinc-400`;

// Lets the browser's "required" check work on custom pickers: an invisible
// input over the trigger carries the value.
export const RequiredProxy = ({ required, value, name }) => (
  <input
    tabIndex={-1}
    aria-hidden
    required={required}
    name={name}
    value={value ?? ''}
    onChange={() => {}}
    className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
  />
);

// Mimics the change event of a native input so existing `e.target.value` handlers keep working.
export const changeEvent = (value, name) => ({ target: { value, name }, currentTarget: { value, name } });
