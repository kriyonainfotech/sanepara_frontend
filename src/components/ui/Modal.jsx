import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:pt-[10vh]">
      <div className="fixed inset-0 bg-zinc-950/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${width} rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200 animate-pop-in`}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
          </div>
          <button onClick={onClose} className="-mr-2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-zinc-100 bg-zinc-50/60 px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
