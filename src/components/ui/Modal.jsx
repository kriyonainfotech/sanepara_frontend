import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// `scroll`: long forms keep the title and buttons in view and scroll only the body.
export default function Modal({ open, onClose, title, description, children, footer, size = 'md', scroll = false }) {
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
    <div className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 ${scroll ? 'sm:pt-[7vh]' : 'sm:pt-[10vh]'}`}>
      <div className="fixed inset-0 bg-zinc-950/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${width} rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200 animate-pop-in ${scroll ? 'flex max-h-[calc(100vh-2rem)] flex-col sm:max-h-[85vh]' : ''}`}>
        <div className={`flex items-start justify-between gap-4 px-6 pt-5 ${scroll ? 'shrink-0 pb-4 border-b border-zinc-100' : ''}`}>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
          </div>
          <button onClick={onClose} className="-mr-2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={`px-6 py-5 ${scroll ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}>{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 rounded-b-2xl border-t border-zinc-100 bg-zinc-50/60 px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
