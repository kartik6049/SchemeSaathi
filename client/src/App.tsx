/**
 * Route table. Public pages share <Layout>; admin pages are lazy-loaded
 * (keeps the citizen bundle small on slow networks, NFR-02) and wrapped
 * in their own auth provider + guard.
 */
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoadingState } from './components/ui/States';
import { QuestionnairePage } from './features/questionnaire/QuestionnairePage';
import { ResultsPage } from './features/results/ResultsPage';
import { SchemeDetailPage } from './features/schemes/SchemeDetailPage';
import { SchemesPage } from './features/schemes/SchemesPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

const AdminRoutes = lazy(() => import('./features/admin/AdminRoutes'));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="check" element={<QuestionnairePage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="schemes" element={<SchemesPage />} />
        <Route path="schemes/:slug" element={<SchemeDetailPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route
        path="admin/*"
        element={
          <Suspense fallback={<LoadingState />}>
            <AdminRoutes />
          </Suspense>
        }
      />
    </Routes>
  );
}
