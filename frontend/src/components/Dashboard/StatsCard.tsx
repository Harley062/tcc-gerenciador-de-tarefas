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
  const colorConfig = {
    primary: {
      bg: 'bg-primary-50/50 dark:bg-primary-900/10',
      text: 'text-primary-600 dark:text-primary-400',
      icon: 'bg-primary-100 dark:bg-primary-900/30',
      border: 'border-primary-100 dark:border-primary-800/30'
    },
    success: {
      bg: 'bg-green-50/50 dark:bg-green-900/10',
      text: 'text-green-600 dark:text-green-400',
      icon: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-100 dark:border-green-800/30'
    },
    warning: {
      bg: 'bg-yellow-50/50 dark:bg-yellow-900/10',
      text: 'text-yellow-600 dark:text-yellow-400',
      icon: 'bg-yellow-100 dark:bg-yellow-900/30',
      border: 'border-yellow-100 dark:border-yellow-800/30'
    },
    error: {
      bg: 'bg-red-50/50 dark:bg-red-900/10',
      text: 'text-red-600 dark:text-red-400',
      icon: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-100 dark:border-red-800/30'
    },
    gray: {
      bg: 'bg-gray-50/50 dark:bg-gray-800/50',
      text: 'text-gray-600 dark:text-gray-400',
      icon: 'bg-gray-100 dark:bg-gray-700',
      border: 'border-gray-200 dark:border-gray-700'
    }
  };

  const config = colorConfig[color];

  return (
    <article
      className={`relative overflow-hidden rounded-2xl p-6 border ${config.border} ${config.bg} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
      role="region"
      aria-label={`Estatística: ${title}`}
    >
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${config.icon} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity`}></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
        {icon && (
          <div
            className={`w-10 h-10 ${config.icon} ${config.text} rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform duration-300`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2 leading-none font-display relative z-10">
        {value}
      </div>

      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 relative z-10 font-medium">
          {subtitle}
        </p>
      )}

      {trend && (
        <div
          className={`flex items-center gap-1 text-sm font-bold relative z-10 ${
            trend.isPositive
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
          role="status"
          aria-label={`Tendência: ${trend.isPositive ? 'Aumento' : 'Diminuição'} de ${Math.abs(trend.value)}%`}
        >
          <span className="text-lg" aria-hidden="true">
            {trend.isPositive ? '↑' : '↓'}
          </span>
          <span>{Math.abs(trend.value)}%</span>
          <span className="ml-1 text-gray-400 dark:text-gray-500 font-medium text-xs uppercase">
            vs anterior
          </span>
        </div>
      )}
    </article>
  );
};

export default StatsCard;
