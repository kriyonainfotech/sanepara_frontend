import { useCallback, useState } from 'react';
import { FloatingPanel, useEscape, useFloating } from './Floating';

// Click-to-open floating panel that closes on outside click / Escape. It is
// rendered on top of the page and flips upward near the bottom of the screen,
// so tables and scroll areas never cut it off.
export default function Popover({ trigger, children, align = 'left', className = '', panelClassName = '' }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, panelRef, pos } = useFloating(open, close, { align });
  useEscape(open, close);

  return (
    <div ref={anchorRef} className={`relative ${className}`}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <FloatingPanel panelRef={panelRef} pos={pos} className={`p-1 ${panelClassName}`}>
          {children({ close })}
        </FloatingPanel>
      )}
    </div>
  );
}
