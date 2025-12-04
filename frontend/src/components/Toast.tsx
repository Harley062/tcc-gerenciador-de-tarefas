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

  const typeConfig = {
    success: {
      bg: 'bg-green-500/90 dark:bg-green-600/90 backdrop-blur-md border-green-400/50',
      text: 'text-white',
      icon: (
        <div className="bg-white/20 rounded-full p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
      label: 'Sucesso'
    },
    error: {
      bg: 'bg-red-500/90 dark:bg-red-600/90 backdrop-blur-md border-red-400/50',
      text: 'text-white',
      icon: (
        <div className="bg-white/20 rounded-full p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      ),
      label: 'Erro'
    },
    info: {
      bg: 'bg-blue-500/90 dark:bg-blue-600/90 backdrop-blur-md border-blue-400/50',
      text: 'text-white',
      icon: (
        <div className="bg-white/20 rounded-full p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      label: 'Informação'
    },
    warning: {
      bg: 'bg-yellow-500/90 dark:bg-yellow-600/90 backdrop-blur-md border-yellow-400/50',
      text: 'text-white',
      icon: (
        <div className="bg-white/20 rounded-full p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      ),
      label: 'Aviso'
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`${config.bg} ${config.text} px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 min-w-[320px] max-w-[500px] transition-all duration-500 transform hover:scale-[1.02] hover:shadow-xl ${
        isExiting ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-slide-up'
      }`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${config.label}: ${message}`}
    >
      <div className="flex-shrink-0 animate-bounce-subtle" aria-hidden="true">
        {config.icon}
      </div>

      <p className="flex-1 text-sm font-medium leading-relaxed drop-shadow-sm">
        {message}
      </p>

      {action && (
        <button
          onClick={() => {
            action.onClick();
            handleClose();
          }}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 text-xs font-bold uppercase tracking-wide whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}

      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 opacity-80 hover:opacity-100"
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
