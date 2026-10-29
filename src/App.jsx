import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Spinner from './components/ui/Spinner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Services from './pages/Services';
import Team from './pages/Team';
import Permissions from './pages/Permissions';
import ScheduleManagement from './pages/ScheduleManagement';
import TasksManagement from './pages/TasksManagement';
import MyTasks from './pages/MyTasks';
import DailyTasks from './pages/DailyTasks';
import ChecklistTemplates from './pages/ChecklistTemplates';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Sales from './pages/Sales';
import B2B from './pages/B2B';
import GstFiling from './pages/GstFiling';
import Reminders from './pages/Reminders';
import Compliance from './pages/Compliance';
import Collection from './pages/Collection';
import Expenses from './pages/Expenses';
import Invoices from './pages/Invoices';
import PaymentQR from './pages/PaymentQR';
import Incentives from './pages/Incentives';
import Sop from './pages/Sop';
import Reports from './pages/Reports';
import FirmSettings from './pages/FirmSettings';
import WhatsAppSettings from './pages/WhatsAppSettings';
import ComingSoon from './pages/ComingSoon';
import { allNavItems, canSee } from './lib/nav';

// `item` is a nav entry — its perm / superAdmin rule guards the route too.
function Protected({ children, item }) {
  const auth = useAuth();
  if (auth.loading) return <Spinner className="h-full" />;
  if (!auth.user) return <Navigate to="/login" replace />;
  if (item && !canSee(item, auth)) return <Navigate to="/" replace />;
  return children;
}

const navItem = (to) => allNavItems.find((i) => i.to === to);

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Protected item={navItem('/customers')}><Customers /></Protected>} />
        <Route path="customers/:id" element={<Protected item={navItem('/customers')}><CustomerDetail /></Protected>} />
        <Route path="services" element={<Protected item={navItem('/services')}><Services /></Protected>} />
        <Route path="schedule" element={<Protected item={navItem('/schedule')}><ScheduleManagement /></Protected>} />
        <Route path="tasks" element={<Protected item={navItem('/tasks')}><TasksManagement /></Protected>} />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="daily-tasks" element={<Protected item={navItem('/daily-tasks')}><DailyTasks /></Protected>} />
        <Route path="checklist-templates" element={<Protected item={navItem('/checklist-templates')}><ChecklistTemplates /></Protected>} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="payroll" element={<Protected item={navItem('/payroll')}><Payroll /></Protected>} />
        <Route path="sales" element={<Protected item={navItem('/sales')}><Sales /></Protected>} />
        <Route path="b2b" element={<Protected item={navItem('/b2b')}><B2B /></Protected>} />
        <Route path="team" element={<Protected item={navItem('/team')}><Team /></Protected>} />
        <Route path="settings/permissions" element={<Protected item={navItem('/settings/permissions')}><Permissions /></Protected>} />
        <Route path="reports" element={<Protected item={navItem('/reports')}><Reports /></Protected>} />
        <Route path="gst-filing" element={<Protected item={navItem('/gst-filing')}><GstFiling /></Protected>} />
        <Route path="reminders" element={<Protected item={navItem('/reminders')}><Reminders /></Protected>} />
        <Route path="compliance" element={<Protected item={navItem('/compliance')}><Compliance /></Protected>} />
        <Route path="collection" element={<Protected item={navItem('/collection')}><Collection /></Protected>} />
        <Route path="expenses" element={<Protected item={navItem('/expenses')}><Expenses /></Protected>} />
        <Route path="invoices" element={<Protected item={navItem('/invoices')}><Invoices /></Protected>} />
        <Route path="payment-qr" element={<Protected item={navItem('/payment-qr')}><PaymentQR /></Protected>} />
        <Route path="incentives" element={<Incentives />} />
        <Route path="sop" element={<Protected item={navItem('/sop')}><Sop key="sop" kind="SOP" mode="manage" /></Protected>} />
        <Route path="my-sop" element={<Sop key="my-sop" kind="SOP" mode="mine" />} />
        <Route path="rules" element={<Protected item={navItem('/rules')}><Sop key="rules" kind="Rule" mode="manage" /></Protected>} />
        <Route path="my-rules" element={<Sop key="my-rules" kind="Rule" mode="mine" />} />
        <Route path="settings/firm" element={<Protected item={navItem('/settings/firm')}><FirmSettings /></Protected>} />
        <Route path="settings/whatsapp" element={<Protected item={navItem('/settings/whatsapp')}><WhatsAppSettings /></Protected>} />
        {allNavItems
          .filter((i) => !i.ready)
          .map((i) => (
            <Route key={i.to} path={i.to.slice(1)} element={<Protected item={i}><ComingSoon item={i} /></Protected>} />
          ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
