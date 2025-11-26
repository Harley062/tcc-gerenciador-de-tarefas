import React from 'react';
import { Task } from '../store/taskStore';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onStatusChange }) => {
  // Configuração de cores usando o design system
  const priorityConfig = {
    low: {
      bg: 'bg-success-50 dark:bg-success-900/20',
      text: 'text-success-700 dark:text-success-300',
      border: 'border-success-200 dark:border-success-800',
      label: 'Baixa'
    },
    medium: {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      text: 'text-primary-700 dark:text-primary-300',
      border: 'border-primary-200 dark:border-primary-800',
      label: 'Média'
    },
    high: {
      bg: 'bg-warning-50 dark:bg-warning-900/20',
      text: 'text-warning-700 dark:text-warning-300',
      border: 'border-warning-200 dark:border-warning-800',
      label: 'Alta'
    },
    urgent: {
      bg: 'bg-danger-50 dark:bg-danger-900/20',
      text: 'text-danger-700 dark:text-danger-300',
      border: 'border-danger-200 dark:border-danger-800',
      label: 'Urgente'
    },
  };

  const statusConfig = {
    todo: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      label: 'A Fazer'
    },
    in_progress: {
      bg: 'bg-warning-100 dark:bg-warning-900/20',
      text: 'text-warning-700 dark:text-warning-300',
      label: 'Em Progresso'
    },
    done: {
      bg: 'bg-success-100 dark:bg-success-900/20',
      text: 'text-success-700 dark:text-success-300',
      label: 'Concluída'
    },
    cancelled: {
      bg: 'bg-danger-100 dark:bg-danger-900/20',
      text: 'text-danger-700 dark:text-danger-300',
      label: 'Cancelada'
    },
    pending: {
      bg: 'bg-primary-100 dark:bg-primary-900/20',
      text: 'text-primary-700 dark:text-primary-300',
      label: 'Pendente'
    },
  };

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

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <article
      className="card p-5 border border-gray-200 dark:border-gray-700 animate-fade-in group"
      aria-label={`Tarefa: ${task.title}`}
    >
      {/* Cabeçalho */}
      <div className="flex justify-between items-start mb-3 gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1 leading-tight">
          {task.title}
        </h3>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="p-2 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-danger-500"
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

      {/* Descrição */}
      {task.description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Informações da tarefa">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${priorityConfig[task.priority].bg} ${priorityConfig[task.priority].text} ${priorityConfig[task.priority].border}`}
          aria-label={`Prioridade: ${priorityConfig[task.priority].label}`}
        >
          {priorityConfig[task.priority].label}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[task.status].bg} ${statusConfig[task.status].text}`}
          aria-label={`Status: ${statusConfig[task.status].label}`}
        >
          {statusConfig[task.status].label}
        </span>
        {task.due_date && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
              isOverdue
                ? 'bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            aria-label={`Data: ${formatDate(task.due_date)}${isOverdue ? ' (Atrasada)' : ''}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(task.due_date)}
            {isOverdue && <span className="font-bold">!</span>}
          </span>
        )}
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Tags da tarefa">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label={`Tag: ${tag}`}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Botões de ação */}
      {onStatusChange && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onStatusChange(task.id, 'in_progress')}
            className="flex-1 btn bg-warning-500 hover:bg-warning-600 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
            disabled={task.status === 'in_progress'}
            aria-label="Marcar como em progresso"
          >
            Em Progresso
          </button>
          <button
            onClick={() => onStatusChange(task.id, 'done')}
            className="flex-1 btn bg-success-500 hover:bg-success-600 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
            disabled={task.status === 'done'}
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
