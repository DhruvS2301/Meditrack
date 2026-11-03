import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import { AppLayout } from './layouts/AppLayout';

import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Doctors from './pages/Doctors';
import Admissions from './pages/Admissions';
import Departments from './pages/Departments';
import Prescriptions from './pages/Prescriptions';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/prescriptions" element={<Prescriptions />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ToastProvider>
  );
}
