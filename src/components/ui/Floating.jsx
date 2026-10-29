import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Positions a panel under (or above, if there's no room) an anchor element.
// The panel is portalled to <body> so modals and scroll areas don't clip it.
export function useFloating(open, onClose, { align = 'left' } = {}) {
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) return setPos(null);
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      const p = panelRef.current;
      if (!a || !p) return;
      const below = window.innerHeight - a.bottom;
      const up = below < p.offsetHeight + 12 && a.top > below;
      const x = align === 'right' ? a.right - p.offsetWidth : a.left;
      const left = Math.max(8, Math.min(x, window.innerWidth - p.offsetWidth - 8));
      setPos({ left, top: up ? Math.max(8, a.top - p.offsetHeight - 6) : a.bottom + 6, minWidth: a.width });
    };
    place();
    // Clicks inside another floating panel (e.g. a calendar opened from this one) don't count as outside.
    const onDown = (e) => !anchorRef.current?.contains(e.target) && !e.target.closest?.('[data-floating]') && closeRef.current();
    const ro = new ResizeObserver(place);
    ro.observe(panelRef.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return { anchorRef, panelRef, pos };
}

export function FloatingPanel({ panelRef, pos, className = '', children, ...props }) {
  return createPortal(
    <div
      ref={panelRef}
      data-floating
      style={pos ? { position: 'fixed', left: pos.left, top: pos.top, minWidth: pos.minWidth } : { position: 'fixed', left: 0, top: 0, visibility: 'hidden' }}
      className={`z-[60] rounded-xl border border-zinc-200 bg-white shadow-lg animate-pop-in ${className}`}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
}

// Escape closes the picker without also closing a surrounding modal.
export const useEscape = (open, close) =>
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close]);
