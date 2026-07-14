import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Outlet, useLocation, matchPath } from 'react-router-dom';
import { CommandPalette } from '../ui/CommandPalette';
import { NeuralCore } from '../ui/NeuralCore';
import toast, { Toaster } from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { useDemoStore } from '../../store/demoStore';

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isProblemSession = matchPath('/student/problems/:problemId', location.pathname);
  const hideSidebar = Boolean(isProblemSession);

  const user = useAuthStore((state) => state.user);
  const initializeData = useDemoStore((state) => state.initializeData);

  useEffect(() => {
    if (user?.role) {
      initializeData(user.role);
    }
  }, [user, initializeData]);

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] blueprint-grid-dots overflow-x-hidden relative">
      {/* Background Grid Overlay */}
      <div className="absolute inset-0 blueprint-grid pointer-events-none opacity-50"></div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && !hideSidebar && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - responsive behavior */}
      {!hideSidebar && (
        <div className={`fixed lg:hidden inset-y-0 left-0 z-20 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {!hideSidebar && <Topbar onMenuClick={() => setSidebarOpen(true)} />}
        <main className={`flex-1 ${hideSidebar ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-6 lg:p-8'}`}>
          <div className={hideSidebar ? 'h-full' : 'max-w-7xl mx-auto'}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Live System Energy */}
      <CommandPalette />
      <NeuralCore />

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          },
          success: {
            iconTheme: {
              primary: 'var(--success)',
              secondary: 'var(--bg-surface)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--danger)',
              secondary: 'var(--bg-surface)',
            },
          },
        }}
      />
    </div>
  );
}
