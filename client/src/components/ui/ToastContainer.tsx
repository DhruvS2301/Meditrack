import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: '#367653',
  error: '#B74B43',
  warning: '#B78035',
  info: '#315C48',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon = icons[t.type];
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={16} style={{ color: colors[t.type], flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#202722' }}>{t.title}</div>
              {t.message && (
                <div style={{ fontSize: '0.75rem', color: '#747C75', marginTop: 2 }}>{t.message}</div>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#747C75', padding: 0, display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
