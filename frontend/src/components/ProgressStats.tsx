import React, { useMemo } from 'react';
import { Task } from '../store/taskStore';

interface ProgressStatsProps {
  tasks: Task[];
}

const ProgressStats: React.FC<ProgressStatsProps> = ({ tasks }) => {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done' && t.status !== 'cancelled').length;
    const high = tasks.filter(t => t.priority === 'high' && t.status !== 'done' && t.status !== 'cancelled').length;
    const medium = tasks.filter(t => t.priority === 'medium' && t.status !== 'done' && t.status !== 'cancelled').length;
    const low = tasks.filter(t => t.priority === 'low' && t.status !== 'done' && t.status !== 'cancelled').length;

    const now = new Date();
    const overdue = tasks.filter(t =>
      t.due_date &&
      new Date(t.due_date) < now &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = tasks.filter(t =>
      t.completed_at &&
      new Date(t.completed_at) >= today
    ).length;

    const tasksWithDuration = tasks.filter(t => t.actual_duration);
    const avgDuration = tasksWithDuration.length > 0
      ? Math.round(tasksWithDuration.reduce((sum, t) => sum + (t.actual_duration || 0), 0) / tasksWithDuration.length)
      : 0;

    return {
      total,
      completed,
      inProgress,
      todo,
      cancelled,
      completionRate,
      urgent,
      high,
      medium,
      low,
      overdue,
      completedToday,
      avgDuration,
    };
  }, [tasks]);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/50 p-6 hover:shadow-md transition-all duration-300">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <span className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-xl">📊</span>
        Estatísticas
      </h2>

      <div className="mb-8 bg-white/50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Progresso Geral
            </span>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.completionRate}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-3 py-1 rounded-full">
              {stats.completed} / {stats.total} tarefas
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out rounded-full relative"
            style={{ width: `${stats.completionRate}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4 hover:scale-[1.02] transition-transform">
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
            Em Progresso
          </div>
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
            {stats.inProgress}
          </div>
        </div>

        <div className="bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800 rounded-xl p-4 hover:scale-[1.02] transition-transform">
          <div className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-2">
            A Fazer
          </div>
          <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
            {stats.todo}
          </div>
        </div>

        <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-xl p-4 hover:scale-[1.02] transition-transform">
          <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
            Atrasadas
          </div>
          <div className="text-3xl font-bold text-red-700 dark:text-red-300">
            {stats.overdue}
          </div>
        </div>

        <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-xl p-4 hover:scale-[1.02] transition-transform">
          <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
            Hoje
          </div>
          <div className="text-3xl font-bold text-green-700 dark:text-green-300">
            {stats.completedToday}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Por Prioridade (Pendentes)
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between group p-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Urgente</span>
            </div>
            <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md text-sm">{stats.urgent}</span>
          </div>
          <div className="flex items-center justify-between group p-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Alta</span>
            </div>
            <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md text-sm">{stats.high}</span>
          </div>
          <div className="flex items-center justify-between group p-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50"></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Média</span>
            </div>
            <span className="font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-md text-sm">{stats.medium}</span>
          </div>
          <div className="flex items-center justify-between group p-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Baixa</span>
            </div>
            <span className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md text-sm">{stats.low}</span>
          </div>
        </div>
      </div>

      {stats.avgDuration > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Duração média</span>
            <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
              {stats.avgDuration} min
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressStats;
