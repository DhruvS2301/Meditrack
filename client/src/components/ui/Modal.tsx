import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 560 }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClass?: string;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', confirmClass = 'btn-danger', isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth={400}
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            className={`btn ${confirmClass}`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: '#747C75', margin: 0, lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}
