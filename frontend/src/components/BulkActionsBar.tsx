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
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up">
      <div className="h-1 w-full bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500"></div>
      
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-t border-white/20 dark:border-gray-700/50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onClearSelection}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Limpar seleção"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full font-bold text-sm">
                  {selectedTaskIds.length}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  tarefa{selectedTaskIds.length > 1 ? 's' : ''} selecionada{selectedTaskIds.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 border border-gray-200 dark:border-gray-600">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-2 uppercase tracking-wider">Status</span>
                <button
                  onClick={() => onBulkStatusChange('todo')}
                  className="px-3 py-1.5 hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
                  title="Marcar como A Fazer"
                >
                  A Fazer
                </button>
                <button
                  onClick={() => onBulkStatusChange('in_progress')}
                  className="px-3 py-1.5 hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
                  title="Marcar como Em Progresso"
                >
                  Em Progresso
                </button>
                <button
                  onClick={() => onBulkStatusChange('done')}
                  className="px-3 py-1.5 hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
                  title="Marcar como Concluído"
                >
                  Concluído
                </button>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 border border-gray-200 dark:border-gray-600">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-2 uppercase tracking-wider">Prioridade</span>
                <button
                  onClick={() => onBulkPriorityChange('urgent')}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 text-red-500 rounded-lg transition-all hover:shadow-sm hover:scale-110"
                  title="Urgente"
                >
                  🔴
                </button>
                <button
                  onClick={() => onBulkPriorityChange('high')}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 text-orange-500 rounded-lg transition-all hover:shadow-sm hover:scale-110"
                  title="Alta"
                >
                  🟠
                </button>
                <button
                  onClick={() => onBulkPriorityChange('medium')}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 text-yellow-500 rounded-lg transition-all hover:shadow-sm hover:scale-110"
                  title="Média"
                >
                  🟡
                </button>
                <button
                  onClick={() => onBulkPriorityChange('low')}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 text-green-500 rounded-lg transition-all hover:shadow-sm hover:scale-110"
                  title="Baixa"
                >
                  🟢
                </button>
              </div>

              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

              <button
                onClick={onBulkDelete}
                className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-bold transition-all flex items-center gap-2 hover:shadow-lg hover:shadow-red-500/10 active:scale-95"
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
    </div>
  );
};

export default BulkActionsBar;
