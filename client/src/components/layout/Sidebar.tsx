import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Stethoscope, BedDouble,
  Building2, FileText, CreditCard, BarChart3, Settings,
  Cross, X,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/admissions', label: 'Admissions & Beds', icon: BedDouble },
  { to: '/departments', label: 'Departments', icon: Building2 },
  { to: '/prescriptions', label: 'Prescriptions', icon: FileText },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && onClose && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={onClose}
          style={{ display: window.innerWidth < 768 ? 'block' : 'none' }}
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Brand */}
        <div style={{
          padding: '1rem 0.875rem 0.875rem',
          borderBottom: '1px solid #E2E6DF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 28, height: 28,
              background: '#315C48',
              borderRadius: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Cross size={14} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#202722', letterSpacing: '-0.02em' }}>
                MediTrack
              </div>
              <div style={{ fontSize: '0.65rem', color: '#747C75', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: -1 }}>
                Hospital System
              </div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ padding: '0.5rem 0.5rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#747C75', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.5rem 0.5rem 0.25rem' }}>
              Navigation
            </div>
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ display: 'flex' }}
              >
                <Icon size={15} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer profile */}
        <div style={{
          padding: '0.75rem 0.875rem',
          borderTop: '1px solid #E2E6DF',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#DCE9DF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 600, color: '#315C48', flexShrink: 0,
            }}>A</div>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#202722' }}>Admin Staff</div>
              <div style={{ fontSize: '0.7rem', color: '#747C75' }}>Administrator</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
