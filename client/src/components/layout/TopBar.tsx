import { useLocation, Link } from 'react-router-dom';
import { Menu, Plus, Calendar, UserPlus, BedDouble, CreditCard } from 'lucide-react';
import { useState } from 'react';

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/doctors': 'Doctors',
  '/admissions': 'Admissions & Beds',
  '/departments': 'Departments',
  '/prescriptions': 'Prescriptions',
  '/billing': 'Billing',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { pathname } = useLocation();
  const [showQuick, setShowQuick] = useState(false);

  const title = Object.entries(pageTitles).find(([k]) =>
    k === '/' ? pathname === '/' : pathname.startsWith(k)
  )?.[1] ?? 'MediTrack';

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <header className="topbar">
      {/* Mobile menu */}
      <button onClick={onMenuClick} className="btn btn-ghost btn-sm" style={{ padding: 4 }} aria-label="Open menu">
        <Menu size={18} />
      </button>

      {/* Page title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#202722' }}>{title}</h1>
      </div>

      {/* Date */}
      <div style={{ fontSize: '0.75rem', color: '#747C75', whiteSpace: 'nowrap', display: 'none' }}
        className="hidden md:block">
        {today}
      </div>

      {/* Quick Actions */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowQuick(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} />
          Quick Add
        </button>

        {showQuick && (
          <>
            <div onClick={() => setShowQuick(false)} style={{
              position: 'fixed', inset: 0, zIndex: 10
            }} />
            <div style={{
              position: 'absolute', right: 0, top: '110%',
              background: 'white', border: '1px solid #E2E6DF',
              borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              minWidth: 180, zIndex: 20, overflow: 'hidden',
            }}>
              {[
                { to: '/patients?action=new', label: 'Register Patient', icon: UserPlus },
                { to: '/appointments?action=new', label: 'Schedule Appointment', icon: Calendar },
                { to: '/admissions?action=new', label: 'Admit Patient', icon: BedDouble },
                { to: '/billing?action=new', label: 'Generate Bill', icon: CreditCard },
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setShowQuick(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '0.5rem 0.875rem', fontSize: '0.8125rem',
                    color: '#202722', textDecoration: 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F7F8F5')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <Icon size={14} color="#747C75" />
                  {label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
