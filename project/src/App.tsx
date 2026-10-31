import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RequireAdmin, RequireAuth, PageLoading } from '@/components/layout/RouteGuards';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { TestInstructionsPage } from '@/pages/TestInstructionsPage';
import { TestTakingPage } from '@/pages/TestTakingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { RevisePage } from '@/pages/RevisePage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ReferralPage } from '@/pages/ReferralPage';
import { AiPage } from '@/pages/AiPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const ResultPage = lazy(() => import('@/pages/ResultPage').then((m) => ({ default: m.ResultPage })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })));
const AdminTestsPage = lazy(() => import('@/pages/admin/AdminTestsPage').then((m) => ({ default: m.AdminTestsPage })));
const AdminTestEditorPage = lazy(() => import('@/pages/admin/AdminTestEditorPage').then((m) => ({ default: m.AdminTestEditorPage })));
const AdminQuestionsPage = lazy(() => import('@/pages/admin/AdminQuestionsPage').then((m) => ({ default: m.AdminQuestionsPage })));
const AdminBulkUploadPage = lazy(() => import('@/pages/admin/AdminBulkUploadPage').then((m) => ({ default: m.AdminBulkUploadPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminSeedPage = lazy(() => import('@/pages/admin/AdminSeedPage').then((m) => ({ default: m.AdminSeedPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppErrorBoundary>
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route element={<SiteLayout />}>
                    <Route index element={<LandingPage />} />
                    <Route path="login" element={<LoginPage />} />
                    <Route path="categories" element={<RequireAuth><CategoriesPage /></RequireAuth>} />
                    <Route path="categories/:categoryId" element={<RequireAuth><CategoryPage /></RequireAuth>} />
                    <Route path="tests/:testId" element={<RequireAuth><TestInstructionsPage /></RequireAuth>} />
                    <Route path="results/:attemptId" element={<RequireAuth><ResultPage /></RequireAuth>} />
                    <Route path="dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
                    <Route path="revise" element={<RequireAuth><RevisePage /></RequireAuth>} />
                    <Route path="leaderboard/:testId" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
                    <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                    <Route path="referral" element={<RequireAuth><ReferralPage /></RequireAuth>} />
                    <Route path="ai" element={<RequireAuth><AiPage /></RequireAuth>} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  <Route path="tests/:testId/attempt" element={<RequireAuth><TestTakingPage /></RequireAuth>} />

                  <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                    <Route index element={<AdminDashboardPage />} />
                    <Route path="categories" element={<AdminCategoriesPage />} />
                    <Route path="tests" element={<AdminTestsPage />} />
                    <Route path="tests/new" element={<AdminTestEditorPage />} />
                    <Route path="tests/:testId/edit" element={<AdminTestEditorPage />} />
                    <Route path="tests/:testId/questions" element={<AdminQuestionsPage />} />
                    <Route path="tests/:testId/questions/bulk" element={<AdminBulkUploadPage />} />
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="analytics" element={<AdminAnalyticsPage />} />
                    <Route path="seed" element={<AdminSeedPage />} />
                  </Route>
                </Routes>
              </Suspense>
              </AppErrorBoundary>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
