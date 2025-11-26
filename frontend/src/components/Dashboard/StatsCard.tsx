import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gray';
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
}) => {
  // Mapeamento de cores usando o design system
  const colorConfig = {
    primary: {
      bg: 'bg-primary-100 dark:bg-primary-900/30',
      text: 'text-primary-600 dark:text-primary-400',
      icon: 'bg-primary-50 dark:bg-primary-900/50'
    },
    success: {
      bg: 'bg-success-100 dark:bg-success-900/30',
      text: 'text-success-600 dark:text-success-400',
      icon: 'bg-success-50 dark:bg-success-900/50'
    },
    warning: {
      bg: 'bg-warning-100 dark:bg-warning-900/30',
      text: 'text-warning-600 dark:text-warning-400',
      icon: 'bg-warning-50 dark:bg-warning-900/50'
    },
    error: {
      bg: 'bg-danger-100 dark:bg-danger-900/30',
      text: 'text-danger-600 dark:text-danger-400',
      icon: 'bg-danger-50 dark:bg-danger-900/50'
    },
    gray: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-600 dark:text-gray-400',
      icon: 'bg-gray-50 dark:bg-gray-800'
    }
  };

  const config = colorConfig[color];

  return (
    <article
      className="card p-6 border border-gray-200 dark:border-gray-700 animate-fade-in hover:scale-[1.02] transition-all duration-300"
      role="region"
      aria-label={`Estatística: ${title}`}
    >
      {/* Cabeçalho com título e ícone */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
        {icon && (
          <div
            className={`w-10 h-10 ${config.icon} ${config.text} rounded-lg flex items-center justify-center text-xl transition-all duration-200`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {/* Valor principal */}
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 leading-none font-display">
        {value}
      </div>

      {/* Subtítulo */}
      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {subtitle}
        </p>
      )}

      {/* Indicador de tendência */}
      {trend && (
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            trend.isPositive
              ? 'text-success-600 dark:text-success-400'
              : 'text-danger-600 dark:text-danger-400'
          }`}
          role="status"
          aria-label={`Tendência: ${trend.isPositive ? 'Aumento' : 'Diminuição'} de ${Math.abs(trend.value)}%`}
        >
          <span className="text-base font-bold" aria-hidden="true">
            {trend.isPositive ? '↑' : '↓'}
          </span>
          <span>{Math.abs(trend.value)}%</span>
          <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">
            vs período anterior
          </span>
        </div>
      )}
    </article>
  );
};

export default StatsCard;
