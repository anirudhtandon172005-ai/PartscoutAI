import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-card toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && <CheckCircle2 size={16} className="text-teal" />}
            {toast.type === 'warning' && <AlertCircle size={16} className="text-amber" />}
            {toast.type === 'info' && <Info size={16} className="text-primary" />}
          </div>
          <div className="toast-content">
            <h5 className="toast-title">{toast.title}</h5>
            <p className="toast-message">{toast.message}</p>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss Notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
