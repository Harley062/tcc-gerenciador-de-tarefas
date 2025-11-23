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

    // Tarefas por prioridade
    const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done' && t.status !== 'cancelled').length;
    const high = tasks.filter(t => t.priority === 'high' && t.status !== 'done' && t.status !== 'cancelled').length;
    const medium = tasks.filter(t => t.priority === 'medium' && t.status !== 'done' && t.status !== 'cancelled').length;
    const low = tasks.filter(t => t.priority === 'low' && t.status !== 'done' && t.status !== 'cancelled').length;

    // Tarefas atrasadas
    const now = new Date();
    const overdue = tasks.filter(t =>
      t.due_date &&
      new Date(t.due_date) < now &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
    ).length;

    // Tarefas concluídas hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = tasks.filter(t =>
      t.completed_at &&
      new Date(t.completed_at) >= today
    ).length;

    // Média de duração
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Estatísticas e Progresso
      </h2>

      {/* Barra de Progresso Global */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progresso Geral
          </span>
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
            {stats.completionRate}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 rounded-full"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {stats.completed} de {stats.total} tarefas concluídas
        </div>
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
            Em Progresso
          </div>
          <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
            {stats.inProgress}
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 uppercase tracking-wide mb-1">
            A Fazer
          </div>
          <div className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">
            {stats.todo}
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide mb-1">
            Atrasadas
          </div>
          <div className="text-3xl font-bold text-red-800 dark:text-red-200">
            {stats.overdue}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">
            Hoje
          </div>
          <div className="text-3xl font-bold text-green-800 dark:text-green-200">
            {stats.completedToday}
          </div>
        </div>
      </div>

      {/* Tarefas por Prioridade */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Por Prioridade (Pendentes)
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm text-gray-700 dark:text-gray-300">Urgente</span>
            </div>
            <span className="font-bold text-red-600 dark:text-red-400">{stats.urgent}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-sm text-gray-700 dark:text-gray-300">Alta</span>
            </div>
            <span className="font-bold text-orange-600 dark:text-orange-400">{stats.high}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-sm text-gray-700 dark:text-gray-300">Média</span>
            </div>
            <span className="font-bold text-yellow-600 dark:text-yellow-400">{stats.medium}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm text-gray-700 dark:text-gray-300">Baixa</span>
            </div>
            <span className="font-bold text-green-600 dark:text-green-400">{stats.low}</span>
          </div>
        </div>
      </div>

      {/* Informações Adicionais */}
      {stats.avgDuration > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Duração média: <span className="font-semibold text-gray-900 dark:text-white">{stats.avgDuration}min</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressStats;
