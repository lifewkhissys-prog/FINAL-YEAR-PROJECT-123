import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

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
          <Route path="/thesis/dashboard" element={<SupervisorDashboardPage />} />
          <Route path="/thesis/upload" element={<UploadThesisPage />} />
          <Route path="/thesis/submission/:id/structure" element={<StructureMappingPage />} />
          <Route path="/thesis/submission/:id/scoring" element={<CriterionScoringPage />} />
          <Route path="/thesis/submission/:id/verification" element={<VerificationCheckPage />} />
          <Route path="/thesis/submission/:id/report" element={<FinalNarrativeReportPage />} />
          <Route path="/thesis/rubric" element={<RubricEditorPage />} />

          {/* Legacy fallback */}
          <Route path="/lecturer/thesis-critique" element={<Navigate to="/thesis/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
