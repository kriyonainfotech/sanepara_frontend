export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const formatMoney = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', team: 'Team' };

// Day strings are 'YYYY-MM-DD' (India time); `today` comes from the server.
export const addDays = (key, n) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const formatDay = (key, today) => {
  if (!key) return '—';
  if (today) {
    if (key === today) return 'Today';
    if (key === addDays(today, 1)) return 'Tomorrow';
    if (key === addDays(today, -1)) return 'Yesterday';
  }
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export const localToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

export const monthOf = (key) => key.slice(0, 7);
export const monthStartKey = (key) => `${key.slice(0, 7)}-01`;
export const monthEndKey = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${key.slice(0, 7)}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};
export const shiftMonth = (key, n) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
};
export const monthLabel = (key, opts = { month: 'long', year: 'numeric' }) =>
  new Date(`${monthStartKey(key)}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });

// Sunday-first grid of day keys covering the whole month.
export const monthGrid = (key) => {
  const start = new Date(`${monthStartKey(key)}T00:00:00Z`);
  const end = new Date(`${monthEndKey(key)}T00:00:00Z`);
  const first = addDays(monthStartKey(key), -start.getUTCDay());
  const last = addDays(monthEndKey(key), 6 - end.getUTCDay());
  const days = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  return days;
};

export const shortDay = (key) =>
  key ? new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—';
export const longDay = (key) =>
  key ? new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—';
