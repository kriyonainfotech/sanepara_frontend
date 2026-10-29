// Task statuses, categories and colour helpers shared by the task screens.
export const STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending', color: '#f59e0b' },
  { label: 'Done', value: 'Done', color: '#327744' },
  { label: 'Overdue', value: 'Overdue', color: '#ff0000' },
];

export const CATEGORIES = ['General', 'GST', 'ITR', 'Trademark', 'Accounting', 'Documents', 'Follow-up', 'Meeting', 'Other'];

export const OVERDUE_COLOR = '#ef4444';
export const TODAY_COLOR = '#fb923c';
export const FUTURE_PENDING_COLOR = '#eab308';
export const DONE_COLOR = '#16a34a';

const DONE = ['done', 'completed', 'approved', 'posted'];
export const isDone = (status) => DONE.includes(String(status || '').trim().toLowerCase());

export const statusOption = (status) =>
  STATUS_OPTIONS.find((o) => o.value.toLowerCase() === String(status || '').toLowerCase());
export const statusColor = (status, fallback = '#64748b') => statusOption(status)?.color || fallback;

export const hexToRgba = (hex, alpha) => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return [r, g, b].some(Number.isNaN) ? `rgba(100,116,139,${alpha})` : `rgba(${r},${g},${b},${alpha})`;
};

export const paletteStyle = (color, alpha = 0.1) => ({
  backgroundColor: hexToRgba(color, alpha),
  color,
  borderColor: hexToRgba(color, 0.35),
});

export const isDailyTask = (t) => t.isDailyTask === true || t.taskCategory === 'Daily Task';
export const isOtherTask = (t) => t.taskCategory === 'Other';

// Meetings first, then tasks with a time (earliest first), then the rest.
export const sortTasks = (tasks) =>
  [...tasks].sort((a, b) => {
    const am = a.taskCategory === 'Meeting', bm = b.taskCategory === 'Meeting';
    if (am !== bm) return am ? -1 : 1;
    if (!!a.taskTime !== !!b.taskTime) return a.taskTime ? -1 : 1;
    if (a.taskTime && b.taskTime) return a.taskTime.localeCompare(b.taskTime);
    return 0;
  });

export const formatTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

// Turn a sorted task list into rows where tasks of one scheduled service
// (same bunch, same day) sit together under a header, in service order.
export const groupByBunch = (tasks) => {
  const entries = [];
  const groups = {};
  for (const t of tasks) {
    const cs = t.customerService;
    if (!cs?._id) {
      entries.push({ type: 'task', task: t });
      continue;
    }
    const key = `${cs._id}|${t.dueDate}`;
    if (!groups[key]) {
      groups[key] = { type: 'bunch', key, name: cs.service?.name || 'Service', customer: t.client?.businessName, client: t.client, tasks: [] };
      entries.push(groups[key]);
    }
    groups[key].tasks.push(t);
  }
  for (const g of Object.values(groups)) g.tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return entries;
};
