import React from 'react';
import { Task } from '../store/taskStore';

interface BulkActionsBarProps {
  selectedTaskIds: string[];
  tasks: Task[];
  onClearSelection: () => void;
  onBulkStatusChange: (status: Task['status']) => void;
  onBulkPriorityChange: (priority: Task['priority']) => void;
  onBulkDelete: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedTaskIds,
  tasks,
  onClearSelection,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkDelete,
}) => {
  if (selectedTaskIds.length === 0) return null;

  const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary-600 dark:bg-primary-700 shadow-2xl z-40 animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Info */}
          <div className="flex items-center gap-4 text-white">
            <button
              onClick={onClearSelection}
              className="hover:bg-primary-700 dark:hover:bg-primary-800 p-2 rounded transition-colors"
              title="Limpar seleção"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="font-semibold">
              {selectedTaskIds.length} tarefa{selectedTaskIds.length > 1 ? 's' : ''} selecionada{selectedTaskIds.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mudar Status */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <span className="text-white text-sm px-2">Status:</span>
              <button
                onClick={() => onBulkStatusChange('todo')}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors"
                title="Marcar como A Fazer"
              >
                A Fazer
              </button>
              <button
                onClick={() => onBulkStatusChange('in_progress')}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors"
                title="Marcar como Em Progresso"
              >
                Em Progresso
              </button>
              <button
                onClick={() => onBulkStatusChange('done')}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium transition-colors"
                title="Marcar como Concluído"
              >
                Concluído
              </button>
            </div>

            {/* Mudar Prioridade */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <span className="text-white text-sm px-2">Prioridade:</span>
              <button
                onClick={() => onBulkPriorityChange('urgent')}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
                title="Marcar como Urgente"
              >
                Urgente
              </button>
              <button
                onClick={() => onBulkPriorityChange('high')}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium transition-colors"
                title="Marcar como Alta"
              >
                Alta
              </button>
              <button
                onClick={() => onBulkPriorityChange('medium')}
                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm font-medium transition-colors"
                title="Marcar como Média"
              >
                Média
              </button>
              <button
                onClick={() => onBulkPriorityChange('low')}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
                title="Marcar como Baixa"
              >
                Baixa
              </button>
            </div>

            {/* Deletar */}
            <button
              onClick={onBulkDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              title="Deletar selecionados"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Deletar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;
