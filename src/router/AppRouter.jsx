import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import useAuthStore from '../store/authStore';
import { AppShell } from '../components/layout/AppShell';

// Lazy load all page components for better performance
const LandingPage = React.lazy(() => import('../pages/shared/LandingPage').then(module => ({ default: module.LandingPage })));
const NotFoundPage = React.lazy(() => import('../pages/shared/NotFoundPage').then(module => ({ default: module.NotFoundPage })));

// Auth pages
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('../pages/auth/RegisterPage').then(module => ({ default: module.RegisterPage })));

// Student pages
const StudentDashboard = React.lazy(() => import('../pages/student/StudentDashboard').then(module => ({ default: module.StudentDashboard })));
const MyCoursesPage = React.lazy(() => import('../pages/student/MyCoursesPage').then(module => ({ default: module.MyCoursesPage })));
const CourseDetailPage = React.lazy(() => import('../pages/student/CourseDetailPage').then(module => ({ default: module.CourseDetailPage })));
const ChallengePage = React.lazy(() => import('../pages/student/ChallengePage').then(module => ({ default: module.ChallengePage })));
const GuidedPage = React.lazy(() => import('../pages/student/GuidedPage').then(module => ({ default: module.GuidedPage })));
const ActiveAssessmentsPage = React.lazy(() => import('../pages/student/ActiveAssessmentsPage').then(module => ({ default: module.ActiveAssessmentsPage })));
const SubmissionsPage = React.lazy(() => import('../pages/student/SubmissionsPage').then(module => ({ default: module.SubmissionsPage })));

// Lecturer pages
const LecturerDashboard = React.lazy(() => import('../pages/lecturer/LecturerDashboard').then(module => ({ default: module.LecturerDashboard })));
const LecturerCoursesPage = React.lazy(() => import('../pages/lecturer/LecturerCoursesPage').then(module => ({ default: module.LecturerCoursesPage })));
const CourseManagePage = React.lazy(() => import('../pages/lecturer/CourseManagePage').then(module => ({ default: module.CourseManagePage })));
const ProblemAuthorPage = React.lazy(() => import('../pages/lecturer/ProblemAuthorPage').then(module => ({ default: module.ProblemAuthorPage })));
const AssessmentCreatePage = React.lazy(() => import('../pages/lecturer/AssessmentCreatePage').then(module => ({ default: module.AssessmentCreatePage })));
const GradebookPage = React.lazy(() => import('../pages/lecturer/GradebookPage').then(module => ({ default: module.GradebookPage })));

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[var(--text-secondary)] text-sm">Loading...</p>
    </div>
  </div>
);
const Dummy = ({ title }) => (
  <div className="p-8 text-[var(--text-primary)]">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="text-[var(--text-secondary)] mt-2">Under construction</p>
  </div>
);

const ProtectedRoute = ({ children, allowedRole }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (allowedRole && user?.role !== allowedRole) return <Navigate to="/dashboard" />;
  return children;
};

const DashboardRouter = () => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" />;
  return user.role === 'lecturer' ? <LecturerDashboard /> : <StudentDashboard />;
};

export function AppRouter() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardRouter />} />

            {/* Student Routes */}
            <Route path="/courses" element={<ProtectedRoute allowedRole="student"><MyCoursesPage /></ProtectedRoute>} />
            <Route path="/courses/:id" element={<ProtectedRoute allowedRole="student"><CourseDetailPage /></ProtectedRoute>} />
            <Route path="/problems/:id/challenge" element={<ProtectedRoute allowedRole="student"><ChallengePage /></ProtectedRoute>} />
            <Route path="/problems/:id/guided" element={<ProtectedRoute allowedRole="student"><GuidedPage /></ProtectedRoute>} />
            <Route path="/assessments/active" element={<ProtectedRoute allowedRole="student"><ActiveAssessmentsPage /></ProtectedRoute>} />
            <Route path="/submissions" element={<ProtectedRoute allowedRole="student"><SubmissionsPage /></ProtectedRoute>} />

            {/* Lecturer Routes */}
            <Route path="/lecturer/courses" element={<ProtectedRoute allowedRole="lecturer"><LecturerCoursesPage /></ProtectedRoute>} />
            <Route path="/lecturer/courses/:id" element={<ProtectedRoute allowedRole="lecturer"><CourseManagePage /></ProtectedRoute>} />
            <Route path="/lecturer/problems" element={<ProtectedRoute allowedRole="lecturer"><Dummy title="Problem Bank" /></ProtectedRoute>} />
            <Route path="/lecturer/problems/new" element={<ProtectedRoute allowedRole="lecturer"><ProblemAuthorPage /></ProtectedRoute>} />
            <Route path="/lecturer/problems/:id/edit" element={<ProtectedRoute allowedRole="lecturer"><ProblemAuthorPage /></ProtectedRoute>} />
            <Route path="/lecturer/assessments" element={<ProtectedRoute allowedRole="lecturer"><Dummy title="Assessments" /></ProtectedRoute>} />
            <Route path="/lecturer/assessments/new" element={<ProtectedRoute allowedRole="lecturer"><AssessmentCreatePage /></ProtectedRoute>} />
            <Route path="/lecturer/assessments/:id/gradebook" element={<ProtectedRoute allowedRole="lecturer"><GradebookPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

