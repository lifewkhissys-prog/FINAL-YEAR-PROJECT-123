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
const StudentProblemPage = React.lazy(() => import('../pages/student/StudentProblemPage').then(module => ({ default: module.StudentProblemPage })));
const ActiveAssessmentsPage = React.lazy(() => import('../pages/student/ActiveAssessmentsPage').then(module => ({ default: module.ActiveAssessmentsPage })));
const AssessmentHubPage = React.lazy(() => import('../pages/student/AssessmentHubPage').then(module => ({ default: module.AssessmentHubPage })));
const AssessmentResultsPage = React.lazy(() => import('../pages/student/AssessmentResultsPage').then(module => ({ default: module.AssessmentResultsPage })));
const SubmissionsPage = React.lazy(() => import('../pages/student/SubmissionsPage').then(module => ({ default: module.SubmissionsPage })));

// Lecturer pages
const LecturerDashboard = React.lazy(() => import('../pages/lecturer/LecturerDashboard').then(module => ({ default: module.LecturerDashboard })));
const LecturerCoursesPage = React.lazy(() => import('../pages/lecturer/LecturerCoursesPage').then(module => ({ default: module.LecturerCoursesPage })));
const CourseCreatePage = React.lazy(() => import('../pages/lecturer/CourseCreatePage').then(module => ({ default: module.CourseCreatePage })));
const CourseManagePage = React.lazy(() => import('../pages/lecturer/CourseManagePage').then(module => ({ default: module.CourseManagePage })));
const LecturerAssessmentsPage = React.lazy(() => import('../pages/lecturer/LecturerAssessmentsPage').then(module => ({ default: module.LecturerAssessmentsPage })));
const AssessmentDetailPage = React.lazy(() => import('../pages/lecturer/AssessmentDetailPage').then(module => ({ default: module.AssessmentDetailPage })));
const ProblemAuthorPage = React.lazy(() => import('../pages/lecturer/ProblemAuthorPage').then(module => ({ default: module.ProblemAuthorPage })));
const ProblemBankPage = React.lazy(() => import('../pages/lecturer/ProblemBankPage').then(module => ({ default: module.ProblemBankPage })));
const AssessmentCreatePage = React.lazy(() => import('../pages/lecturer/AssessmentCreatePage').then(module => ({ default: module.AssessmentCreatePage })));
const GradebookPage = React.lazy(() => import('../pages/lecturer/GradebookPage').then(module => ({ default: module.GradebookPage })));
const StudentAssessmentDetailPage = React.lazy(() => import('../pages/lecturer/StudentAssessmentDetailPage').then(module => ({ default: module.StudentAssessmentDetailPage })));
const StudentCourseHistoryPage = React.lazy(() => import('../pages/lecturer/StudentCourseHistoryPage').then(module => ({ default: module.StudentCourseHistoryPage })));
const ThesisCritiquePage = React.lazy(() => import('../pages/lecturer/ThesisCritiquePage').then(module => ({ default: module.ThesisCritiquePage })));

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
  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard'} />;
  }
  return children;
};

const DashboardRouter = () => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" />;
  return user.role === 'lecturer' ? <Navigate to="/lecturer/dashboard" /> : <Navigate to="/student/dashboard" />;
};

const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/landing" />;
  return user?.role === 'lecturer' ? <Navigate to="/lecturer/dashboard" /> : <Navigate to="/student/dashboard" />;
};

const LogoutRoute = () => {
  const logout = useAuthStore((state) => state.logout);
  logout();
  return <Navigate to="/login" />;
};

export function AppRouter() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
            <Route path="/logout" element={<LogoutRoute />} />

          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardRouter />} />

            {/* Student Routes */}
              <Route path="/student/dashboard" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
              <Route path="/student/courses" element={<ProtectedRoute allowedRole="student"><MyCoursesPage /></ProtectedRoute>} />
              <Route path="/student/courses/:courseId" element={<ProtectedRoute allowedRole="student"><CourseDetailPage /></ProtectedRoute>} />
              <Route path="/student/problems/:problemId" element={<ProtectedRoute allowedRole="student"><StudentProblemPage /></ProtectedRoute>} />
              <Route path="/student/assessments/active" element={<ProtectedRoute allowedRole="student"><ActiveAssessmentsPage /></ProtectedRoute>} />
              <Route path="/student/assessments/:assessmentId" element={<ProtectedRoute allowedRole="student"><AssessmentHubPage /></ProtectedRoute>} />
              <Route path="/student/assessments/:assessmentId/results" element={<ProtectedRoute allowedRole="student"><AssessmentResultsPage /></ProtectedRoute>} />
              <Route path="/student/submissions" element={<ProtectedRoute allowedRole="student"><SubmissionsPage /></ProtectedRoute>} />

            {/* Lecturer Routes */}
              <Route path="/lecturer/dashboard" element={<ProtectedRoute allowedRole="lecturer"><LecturerDashboard /></ProtectedRoute>} />
              <Route path="/lecturer/courses" element={<ProtectedRoute allowedRole="lecturer"><LecturerCoursesPage /></ProtectedRoute>} />
              <Route path="/lecturer/courses/new" element={<ProtectedRoute allowedRole="lecturer"><CourseCreatePage /></ProtectedRoute>} />
              <Route path="/lecturer/courses/:courseId" element={<ProtectedRoute allowedRole="lecturer"><CourseManagePage /></ProtectedRoute>} />
              <Route path="/lecturer/courses/:courseId/students/:userId" element={<ProtectedRoute allowedRole="lecturer"><StudentCourseHistoryPage /></ProtectedRoute>} />
              <Route path="/lecturer/assessments" element={<ProtectedRoute allowedRole="lecturer"><LecturerAssessmentsPage /></ProtectedRoute>} />
              <Route path="/lecturer/assessments/new" element={<ProtectedRoute allowedRole="lecturer"><AssessmentCreatePage /></ProtectedRoute>} />
              <Route path="/lecturer/courses/:courseId/assessments/new" element={<ProtectedRoute allowedRole="lecturer"><AssessmentCreatePage /></ProtectedRoute>} />
              <Route path="/lecturer/assessments/:assessmentId" element={<ProtectedRoute allowedRole="lecturer"><AssessmentDetailPage /></ProtectedRoute>} />
              <Route path="/lecturer/assessments/:assessmentId/gradebook" element={<ProtectedRoute allowedRole="lecturer"><GradebookPage /></ProtectedRoute>} />
              <Route path="/lecturer/assessments/:assessmentId/problems/new" element={<ProtectedRoute allowedRole="lecturer"><ProblemAuthorPage /></ProtectedRoute>} />
              <Route path="/lecturer/assessments/:assessmentId/problems/:problemId/edit" element={<ProtectedRoute allowedRole="lecturer"><ProblemAuthorPage /></ProtectedRoute>} />
              <Route path="/lecturer/problems" element={<ProtectedRoute allowedRole="lecturer"><ProblemBankPage /></ProtectedRoute>} />
              <Route path="/lecturer/problems/new" element={<ProtectedRoute allowedRole="lecturer"><ProblemAuthorPage /></ProtectedRoute>} />
              <Route path="/lecturer/problems/:problemId/edit" element={<ProtectedRoute allowedRole="lecturer"><ProblemAuthorPage /></ProtectedRoute>} />
              <Route path="/lecturer/assessments/:assessmentId/students/:userId" element={<ProtectedRoute allowedRole="lecturer"><StudentAssessmentDetailPage /></ProtectedRoute>} />
              <Route path="/lecturer/thesis-critique" element={<ProtectedRoute allowedRole="lecturer"><ThesisCritiquePage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

