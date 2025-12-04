import React, { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title = 'Confirmação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const variantConfig = {
    danger: {
      button: 'btn-danger',
      icon: '⚠️',
      iconColor: 'text-danger-600 dark:text-danger-400'
    },
    warning: {
      button: 'bg-warning-500 hover:bg-warning-600 text-white focus:ring-warning-500',
      icon: '⚡',
      iconColor: 'text-warning-600 dark:text-warning-400'
    },
    info: {
      button: 'btn-primary',
      icon: 'ℹ️',
      iconColor: 'text-primary-600 dark:text-primary-400'
    }
  };

  const config = variantConfig[variant];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    confirmButtonRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        ref={modalRef}
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full border border-white/20 dark:border-gray-700/50 animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-start gap-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50">
          <div className="flex items-center gap-4 flex-1">
            <div className={`p-3 rounded-xl bg-white/50 dark:bg-gray-700/50 shadow-sm ${config.iconColor}`}>
              <span className="text-2xl" aria-hidden="true">
                {config.icon}
              </span>
            </div>
            <div className="flex-1">
              <h3
                id="modal-title"
                className="text-xl font-bold text-gray-900 dark:text-gray-100"
              >
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Fechar modal"
            title="Fechar (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <p
            id="modal-description"
            className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg"
          >
            {message}
          </p>
        </div>

        <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors font-medium"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`px-8 py-2.5 rounded-xl font-bold shadow-lg transform hover:-translate-y-0.5 transition-all text-white ${
              variant === 'danger' 
                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/30' 
                : variant === 'warning'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 shadow-yellow-500/30 text-gray-900'
                : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-primary-500/30'
            }`}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
