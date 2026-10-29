// Attendance status colours and time helpers.
export const ATT_STATUS = {
  'Full Day': { tone: 'green', color: '#16a34a', short: 'Full' },
  'Half Day': { tone: 'amber', color: '#f59e0b', short: 'Half' },
  Absent: { tone: 'red', color: '#ef4444', short: 'Absent' },
  Leave: { tone: 'blue', color: '#3b82f6', short: 'Leave' },
  Working: { tone: 'violet', color: '#8b5cf6', short: 'Working' },
};

export const time12 = (hhmm) => {
  if (!hhmm) return '--:--';
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const hoursLabel = (h) => {
  if (!h) return '0h';
  const mins = Math.round(h * 60);
  return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
};

export const minutesLabel = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

export const elapsedSince = (date) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};
