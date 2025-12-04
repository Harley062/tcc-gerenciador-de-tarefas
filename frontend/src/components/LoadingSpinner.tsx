import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'white';
  fullScreen?: boolean;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  fullScreen = false,
  text,
}) => {
  const sizeConfig = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  const colorConfig = {
    primary: 'border-primary-500 border-t-transparent',
    success: 'border-green-500 border-t-transparent',
    warning: 'border-yellow-500 border-t-transparent',
    danger: 'border-red-500 border-t-transparent',
    gray: 'border-gray-500 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  const spinner = (
    <div
      className={`${sizeConfig[size]} ${colorConfig[color]} rounded-full animate-spin`}
      role="status"
      aria-label={text || 'Carregando...'}
    />
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in"
        role="alert"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 border border-white/20 dark:border-gray-700/50 animate-scale-in max-w-sm w-full mx-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse"></div>
            {spinner}
          </div>
          {text && (
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-gray-900 dark:text-white animate-pulse">
                {text}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Por favor, aguarde...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      {spinner}
      {text && (
        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
