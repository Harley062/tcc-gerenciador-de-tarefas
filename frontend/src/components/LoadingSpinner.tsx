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
  // Mapeamento de tamanhos
  const sizeConfig = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  // Mapeamento de cores
  const colorConfig = {
    primary: 'border-primary-600 border-t-transparent',
    success: 'border-success-600 border-t-transparent',
    warning: 'border-warning-600 border-t-transparent',
    danger: 'border-danger-600 border-t-transparent',
    gray: 'border-gray-600 border-t-transparent',
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
        className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in"
        role="alert"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="card p-8 flex flex-col items-center gap-4 border border-gray-200 dark:border-gray-700">
          {spinner}
          {text && (
            <p className="text-gray-700 dark:text-gray-300 font-medium text-center">
              {text}
            </p>
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
