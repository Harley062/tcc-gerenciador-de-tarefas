import React from 'react';
import { Task } from '../store/taskStore';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onStatusChange }) => {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-purple-100 text-purple-800',
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

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow border border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-800 flex-1">{task.title}</h3>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Deletar
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-gray-600 text-sm mb-3">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[task.status]}`}>
          {task.status.replace('_', ' ')}
        </span>
        {task.due_date && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
            {formatDate(task.due_date)}
          </span>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {onStatusChange && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => onStatusChange(task.id, 'in_progress')}
            className="flex-1 px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors"
            disabled={task.status === 'in_progress'}
          >
            Em Progresso
          </button>
          <button
            onClick={() => onStatusChange(task.id, 'done')}
            className="flex-1 px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
            disabled={task.status === 'done'}
          >
            Concluir
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
