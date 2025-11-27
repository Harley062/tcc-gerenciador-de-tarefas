import React from 'react';
import { Task, isStatusDone, isPriorityHigh, isPriorityUrgent, isPriorityMedium, isPriorityLow, isStatusInProgress, isStatusTodo, isStatusCancelled } from '../store/taskStore';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
}

const getPriorityConfig = (priority: string) => {
  if (isPriorityLow(priority)) {
    return {
      bg: 'bg-success-50 dark:bg-success-900/20',
      text: 'text-success-700 dark:text-success-300',
      border: 'border-success-200 dark:border-success-800',
      label: 'Baixa'
    };
  }
  if (isPriorityMedium(priority)) {
    return {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      text: 'text-primary-700 dark:text-primary-300',
      border: 'border-primary-200 dark:border-primary-800',
      label: 'Média'
    };
  }
  if (isPriorityHigh(priority)) {
    return {
      bg: 'bg-warning-50 dark:bg-warning-900/20',
      text: 'text-warning-700 dark:text-warning-300',
      border: 'border-warning-200 dark:border-warning-800',
      label: 'Alta'
    };
  }
  if (isPriorityUrgent(priority)) {
    return {
      bg: 'bg-danger-50 dark:bg-danger-900/20',
      text: 'text-danger-700 dark:text-danger-300',
      border: 'border-danger-200 dark:border-danger-800',
      label: 'Urgente'
    };
  }
  return {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
    label: priority
  };
};

const getStatusConfig = (status: string) => {
  if (isStatusTodo(status)) {
    return {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      label: 'A Fazer'
    };
  }
  if (isStatusInProgress(status)) {
    return {
      bg: 'bg-warning-100 dark:bg-warning-900/20',
      text: 'text-warning-700 dark:text-warning-300',
      label: 'Em Progresso'
    };
  }
  if (isStatusDone(status)) {
    return {
      bg: 'bg-success-100 dark:bg-success-900/20',
      text: 'text-success-700 dark:text-success-300',
      label: 'Concluída'
    };
  }
  if (isStatusCancelled(status)) {
    return {
      bg: 'bg-danger-100 dark:bg-danger-900/20',
      text: 'text-danger-700 dark:text-danger-300',
      label: 'Cancelada'
    };
  }
  return {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    label: status
  };
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onStatusChange }) => {
  const priorityConfig = getPriorityConfig(task.priority);
  const statusConfig = getStatusConfig(task.status);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isStatusDone(task.status);

  return (
    <article
      className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5"
      aria-label={`Tarefa: ${task.title}`}
    >
      <div className={`absolute top-0 left-0 w-1.5 h-full ${priorityConfig.bg.replace('bg-', 'bg-').replace(' dark:bg-', ' dark:bg-').split(' ')[0].replace('50', '500')}`}></div>
      
      <div className="flex justify-between items-start mb-3 gap-3 pl-3">
        <h3
          className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1 leading-tight line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
          title={task.title}
        >
          {task.title}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
              aria-label={`Editar tarefa ${task.title}`}
              title="Editar tarefa"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              aria-label={`Deletar tarefa ${task.title}`}
              title="Deletar tarefa"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p
          className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed line-clamp-2 pl-3"
          title={task.description}
        >
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4 pl-3" role="group" aria-label="Informações da tarefa">
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
          aria-label={`Prioridade: ${priorityConfig.label}`}
        >
          {priorityConfig.label}
        </span>
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}
          aria-label={`Status: ${statusConfig.label}`}
        >
          {statusConfig.label}
        </span>
        {task.due_date && (
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${
              isOverdue
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
            }`}
            aria-label={`Data: ${formatDate(task.due_date)}${isOverdue ? ' (Atrasada)' : ''}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(task.due_date)}
            {isOverdue && <span className="font-bold animate-pulse">!</span>}
          </span>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pl-3" role="group" aria-label="Tags da tarefa">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
              aria-label={`Tag: ${tag}`}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {onStatusChange && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 pl-3">
          <button
            onClick={() => onStatusChange(task.id, 'em_progresso')}
            className="flex-1 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isStatusInProgress(task.status)}
            aria-label="Marcar como em progresso"
          >
            Em Progresso
          </button>
          <button
            onClick={() => onStatusChange(task.id, 'concluida')}
            className="flex-1 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isStatusDone(task.status)}
            aria-label="Marcar como concluída"
          >
            Concluir
          </button>
        </div>
      )}
    </article>
  );
};

export default TaskCard;
