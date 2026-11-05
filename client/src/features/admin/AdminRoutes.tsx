/** Lazy-loaded admin section (code-split from the public bundle). */
import { Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from '../../context/AdminAuthContext';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { AdminDashboard } from './AdminDashboard';
import { AdminLayout } from './AdminLayout';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminSchemesPage } from './AdminSchemesPage';
import { SchemeEditorPage } from './SchemeEditorPage';

export default function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="schemes" element={<AdminSchemesPage />} />
          <Route path="schemes/:id" element={<SchemeEditorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
