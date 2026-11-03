import { useState, ReactNode } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { ToastContainer } from '../components/ui/ToastContainer';

export function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-area">
        <TopBar onMenuClick={() => setSidebarOpen(v => !v)} />
        <main className="page-content">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
