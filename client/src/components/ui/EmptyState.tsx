import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon size={40} className="empty-state-icon" />
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#202722', margin: '0 0 0.25rem' }}>{title}</h3>
      {description && (
        <p style={{ fontSize: '0.8125rem', color: '#747C75', margin: '0 0 1rem', maxWidth: 320 }}>{description}</p>
      )}
      {action}
    </div>
  );
}
