import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../lib/api';

// Today's clock-in state for the logged-in member, shared by the sidebar pill,
// the clock card and the "you haven't clocked out" leave-page warning.
const AttendanceContext = createContext(null);

export function AttendanceProvider({ children }) {
  const [today, setToday] = useState(null);

  const refresh = useCallback(() => api.get('/attendance/me/today').then((r) => setToday(r.data)).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);

  const clockedIn = Boolean(today?.record?.inTime && !today?.record?.outTime);

  // Returns true on success so callers can close dialogs.
  const clockIn = useCallback(async () => {
    try {
      const { data } = await api.post('/attendance/clock-in');
      toast.success(data.message);
      await refresh();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }, [refresh]);

  useEffect(() => {
    if (!clockedIn) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = 'You have not clocked out. Are you sure you want to leave?';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [clockedIn]);

  return <AttendanceContext.Provider value={{ today, refresh, clockedIn, clockIn }}>{children}</AttendanceContext.Provider>;
}

export const useAttendance = () => useContext(AttendanceContext);
