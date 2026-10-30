import {
  LayoutDashboard, Users, Layers, CalendarClock, ListChecks, FileCheck2, BellRing,
  TrendingUp, Handshake, Wallet, Receipt, FileText, QrCode, UserCog, Clock,
  IndianRupee, Gift, BookOpen, BookCheck, Scale, ScrollText, ShieldCheck, MessageCircle, NotebookPen, CalendarDays, FileText as FileCheck, BarChart3, Building2, CalendarCheck, Landmark,
} from 'lucide-react';

// `ready: false` items render a "Soon" tag and a placeholder page until built.
// `perm: [module, action]` = permission needed to see it; omitted = everyone
// (Tasks, Attendance, Incentives, My SOP and My Rules always show the member's own data).
// `perm: [[module, action], …]` = any one of these is enough.
// `hideIf: [module, action]` = hidden for people who have that permission.
// `superAdmin: true` = Super Admin only.
export const NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, ready: true },
      { to: '/reports', label: 'Reports & Matrix', icon: BarChart3, ready: true, perm: ['reports', 'view'] },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/customers', label: 'Customers', icon: Users, ready: true, perm: ['customers', 'view'] },
      { to: '/services', label: 'Services', icon: Layers, ready: true, perm: ['services', 'view'] },
      { to: '/schedule', label: 'Schedule Management', icon: CalendarClock, ready: true, perm: ['schedule', 'view'] },
      { to: '/tasks', label: 'Tasks Management', icon: NotebookPen, ready: true, perm: ['tasks', 'view'] },
      { to: '/my-tasks', label: 'My Tasks', icon: ListChecks, ready: true, hideIf: ['tasks', 'view'] },
      { to: '/daily-tasks', label: 'Daily Tasks', icon: CalendarDays, ready: true, perm: ['tasks', 'rituals'] },
      { to: '/checklist-templates', label: 'Checklist Templates', icon: FileCheck, ready: true, perm: ['tasks', 'templates'] },
      { to: '/gst-filing', label: 'Running GST Filing', icon: FileCheck2, ready: true, perm: ['gst_filing', 'view'] },
      { to: '/reminders', label: 'Monthly Reminders', icon: BellRing, ready: true, perm: ['reminders', 'view'] },
      { to: '/compliance', label: 'Compliance Calendar', icon: CalendarCheck, ready: true, perm: ['compliance', 'view'] },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/sales', label: 'Sales', icon: TrendingUp, ready: true, perm: ['sales', 'view'] },
      { to: '/b2b', label: 'B2B Partners', icon: Handshake, ready: true, perm: ['b2b', 'view'] },
      { to: '/collection', label: 'Collection', icon: Wallet, ready: true, perm: ['collection', 'view'] },
      { to: '/expenses', label: 'Expenses', icon: Receipt, ready: true, perm: ['expenses', 'view'] },
      { to: '/banks', label: 'Bank & Cash', icon: Landmark, ready: true, perm: ['banks', 'view'] },
      { to: '/invoices', label: 'Invoices', icon: FileText, ready: true, perm: ['invoices', 'view'] },
      { to: '/payment-qr', label: 'Payment QR', icon: QrCode, ready: true, perm: ['payment_qr', 'use'] },
    ],
  },
  {
    section: 'Team',
    items: [
      { to: '/team', label: 'Team Members', icon: UserCog, ready: true, perm: ['team', 'view'] },
      { to: '/attendance', label: 'Attendance', icon: Clock, ready: true },
      { to: '/payroll', label: 'Payroll', icon: IndianRupee, ready: true, perm: ['payroll', 'view'] },
      { to: '/incentives', label: 'Refer & Incentive', icon: Gift, ready: true },
      { to: '/sop', label: 'SOP Management', icon: BookOpen, ready: true, perm: [['sop', 'view'], ['sop', 'manage']] },
      { to: '/my-sop', label: 'My SOP', icon: BookCheck, ready: true },
      { to: '/rules', label: 'Rule Management', icon: Scale, ready: true, perm: [['rules', 'view'], ['rules', 'manage']] },
      { to: '/my-rules', label: 'My Rules', icon: ScrollText, ready: true },
    ],
  },
  {
    section: 'Settings',
    items: [
      { to: '/settings/permissions', label: 'Roles & Permissions', icon: ShieldCheck, ready: true, superAdmin: true },
      { to: '/settings/firm', label: 'Firm Details', icon: Building2, ready: true, superAdmin: true },
      { to: '/settings/whatsapp', label: 'WhatsApp API', icon: MessageCircle, ready: true, superAdmin: true },
    ],
  },
];

export const canSee = (item, { can, isSuperAdmin }) => {
  if (item.superAdmin) return isSuperAdmin;
  if (item.hideIf && can(...item.hideIf)) return false;
  if (!item.perm) return true;
  return (Array.isArray(item.perm[0]) ? item.perm : [item.perm]).some((p) => can(...p));
};

export const navFor = (auth) =>
  NAV.map((s) => ({ ...s, items: s.items.filter((i) => canSee(i, auth)) })).filter((s) => s.items.length);

export const allNavItems = NAV.flatMap((s) => s.items);
