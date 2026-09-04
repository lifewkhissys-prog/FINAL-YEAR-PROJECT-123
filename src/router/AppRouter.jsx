import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import { getUserFromToken } from '../utils/auth';

// Auth Pages
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('../pages/auth/RegisterPage').then(module => ({ default: module.RegisterPage })));

// Thesis Assessor Pages
const UploadThesisPage = React.lazy(() => import('../pages/lecturer/UploadThesisPage'));
const StructureMappingPage = React.lazy(() => import('../pages/lecturer/StructureMappingPage'));
const CriterionScoringPage = React.lazy(() => import('../pages/lecturer/CriterionScoringPage'));
const VerificationCheckPage = React.lazy(() => import('../pages/lecturer/VerificationCheckPage'));
const FinalNarrativeReportPage = React.lazy(() => import('../pages/lecturer/FinalNarrativeReportPage'));
const SupervisorDashboardPage = React.lazy(() => import('../pages/lecturer/SupervisorDashboardPage'));
const RubricEditorPage = React.lazy(() => import('../pages/lecturer/RubricEditorPage'));
const NotFoundPage = React.lazy(() => import('../pages/shared/NotFoundPage').then(module => ({ default: module.NotFoundPage })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-primary font-semibold text-sm">Loading Thesis Assessor...</p>
    </div>
  </div>
);

function ProtectedRoute({ children }) {
  const { isAuthenticated, user, token, logout } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !token || !getUserFromToken(token)) {
    if (isAuthenticated) {
      logout();
    }
    return <Navigate to="/login?expired=true" state={{ from: location }} replace />;
  }

  if (user?.role !== 'lecturer') {
    logout();
    return <Navigate to="/login" state={{ error: 'Access Denied: Thesis Assessor is strictly reserved for academic supervisors and lecturers.' }} replace />;
  }

  return children;
}

export function AppRouter() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Main Landing & Dashboard Redirects */}
          <Route path="/" element={<Navigate to="/thesis/dashboard" replace />} />
          <Route path="/dashboard" element={<Navigate to="/thesis/dashboard" replace />} />
          <Route path="/lecturer/dashboard" element={<Navigate to="/thesis/dashboard" replace />} />
          <Route path="/student/dashboard" element={<Navigate to="/thesis/dashboard" replace />} />

          {/* Protected Thesis Assessor Routes */}
          <Route path="/thesis/dashboard" element={<ProtectedRoute><SupervisorDashboardPage /></ProtectedRoute>} />
          <Route path="/thesis/upload" element={<ProtectedRoute><UploadThesisPage /></ProtectedRoute>} />
          <Route path="/thesis/submission/:id/structure" element={<ProtectedRoute><StructureMappingPage /></ProtectedRoute>} />
          <Route path="/thesis/submission/:id/scoring" element={<ProtectedRoute><CriterionScoringPage /></ProtectedRoute>} />
          <Route path="/thesis/submission/:id/verification" element={<ProtectedRoute><VerificationCheckPage /></ProtectedRoute>} />
          <Route path="/thesis/submission/:id/report" element={<ProtectedRoute><FinalNarrativeReportPage /></ProtectedRoute>} />
          <Route path="/thesis/rubric" element={<ProtectedRoute><RubricEditorPage /></ProtectedRoute>} />

          {/* Legacy fallback */}
          <Route path="/lecturer/thesis-critique" element={<Navigate to="/thesis/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

