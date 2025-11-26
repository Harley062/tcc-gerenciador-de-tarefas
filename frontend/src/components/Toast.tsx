import React, { useEffect, useState } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, onClose, action }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  // Configuração usando o design system
  const typeConfig = {
    success: {
      bg: 'bg-success-600 dark:bg-success-500',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Sucesso'
    },
    error: {
      bg: 'bg-danger-600 dark:bg-danger-500',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Erro'
    },
    info: {
      bg: 'bg-primary-600 dark:bg-primary-500',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Informação'
    },
    warning: {
      bg: 'bg-warning-600 dark:bg-warning-500',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Aviso'
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`${config.bg} text-white px-4 py-3 rounded-lg shadow-soft-lg flex items-center gap-3 min-w-[300px] max-w-[500px] transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0 animate-slide-up'
      }`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${config.label}: ${message}`}
    >
      {/* Ícone */}
      <div className="flex-shrink-0" aria-hidden="true">
        {config.icon}
      </div>

      {/* Mensagem */}
      <p className="flex-1 text-sm font-medium leading-relaxed">
        {message}
      </p>

      {/* Botão de ação (opcional) */}
      {action && (
        <button
          onClick={() => {
            action.onClick();
            handleClose();
          }}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md transition-all duration-200 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}

      {/* Botão de fechar */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 hover:bg-white/20 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Fechar notificação"
        title="Fechar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default Toast;
