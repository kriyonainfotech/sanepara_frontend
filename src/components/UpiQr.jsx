import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// upi://pay link understood by every UPI app (GPay, PhonePe, Paytm, BHIM…).
export const upiLink = ({ upiId, name, amount, note }) => {
  const p = new URLSearchParams({ pa: upiId.trim(), pn: (name || upiId).trim(), cu: 'INR' });
  if (Number(amount) > 0) p.set('am', Number(amount).toFixed(2));
  if (note?.trim()) p.set('tn', note.trim().slice(0, 80));
  return `upi://pay?${p.toString().replace(/\+/g, '%20')}`;
};

export const isUpiId = (s = '') => /^[\w.-]+@[\w.-]+$/.test(s.trim());

export default function UpiQr({ upiId, name, amount, note, size = 220, onReady, className = '' }) {
  const [src, setSrc] = useState('');
  const valid = isUpiId(upiId || '');

  useEffect(() => {
    if (!valid) return setSrc('');
    const link = upiLink({ upiId, name, amount, note });
    QRCode.toDataURL(link, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' }).then((url) => {
      setSrc(url);
      onReady?.(url, link);
    });
  }, [valid, upiId, name, amount, note, size, onReady]);

  if (!valid) return null;
  return src ? <img src={src} alt="UPI payment QR" width={size} height={size} className={className} /> : <div style={{ width: size, height: size }} />;
}
