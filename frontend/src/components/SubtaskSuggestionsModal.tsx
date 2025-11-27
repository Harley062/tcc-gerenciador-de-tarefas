import React, { useState, useEffect } from 'react';
import { aiApi, SubtaskSuggestion } from '../services/aiApi';
import api from '../services/api';

interface SubtaskSuggestionsModalProps {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  onClose: () => void;
  onSubtasksCreated: () => void;
}

const SubtaskSuggestionsModal: React.FC<SubtaskSuggestionsModalProps> = ({
  taskId,
  taskTitle,
  taskDescription,
  onClose,
  onSubtasksCreated,
}) => {
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[]>([]);
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await aiApi.suggestSubtasks(taskTitle, taskDescription);
      setSuggestions(result.subtasks);
      setSelectedSubtasks(new Set(result.subtasks.map((_, index) => index)));
    } catch (err) {
      console.error('Failed to load subtask suggestions:', err);
      setError('Não foi possível gerar sugestões de subtarefas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubtask = (index: number) => {
    const newSelected = new Set(selectedSubtasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSubtasks(newSelected);
  };

  const handleCreateSubtasks = async () => {
    if (selectedSubtasks.size === 0) {
      onClose();
      return;
    }

    setIsCreating(true);
    try {
      const subtasksToCreate = Array.from(selectedSubtasks).map(index => suggestions[index]);

      await Promise.all(
        subtasksToCreate.map(subtask =>
          api.createSubtask(taskId, {
            title: subtask.title,
            description: subtask.description,
            estimated_duration: subtask.estimated_duration,
            status: 'todo',
            priority: 'medium',
          })
        )
      );

      onSubtasksCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create subtasks:', err);
      setError('Erro ao criar subtarefas. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-white/20 dark:border-gray-700/50 animate-scale-in flex flex-col">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-600 to-primary-500 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <span className="text-xl text-white">✨</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Sugestões de Subtarefas
              </h2>
              <p className="text-sm text-white/80">
                IA sugeriu subtarefas para: <span className="font-medium text-white">{taskTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Gerando sugestões de subtarefas...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl p-6 backdrop-blur-sm text-center">
              <p className="text-red-800 dark:text-red-200 mb-4">{error}</p>
              <button
                onClick={loadSuggestions}
                className="px-6 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
              >
                Tentar Novamente
              </button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🤔</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Nenhuma sugestão de subtarefa disponível.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {selectedSubtasks.size} de {suggestions.length} selecionadas
                </p>
                <button
                  onClick={() => {
                    if (selectedSubtasks.size === suggestions.length) {
                      setSelectedSubtasks(new Set());
                    } else {
                      setSelectedSubtasks(new Set(suggestions.map((_, i) => i)));
                    }
                  }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold transition-colors"
                >
                  {selectedSubtasks.size === suggestions.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </button>
              </div>

              <div className="space-y-3">
                {suggestions.map((subtask, index) => (
                  <div
                    key={index}
                    onClick={() => toggleSubtask(index)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                      selectedSubtasks.has(index)
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 shadow-md'
                        : 'border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedSubtasks.has(index)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-gray-300 dark:border-gray-600 group-hover:border-primary-400'
                      }`}>
                        {selectedSubtasks.has(index) && (
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-lg">
                          {subtask.title}
                        </h3>
                        {subtask.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                            {subtask.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700/50 text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {subtask.estimated_duration} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors font-medium"
            disabled={isCreating}
          >
            {selectedSubtasks.size === 0 ? 'Fechar' : 'Cancelar'}
          </button>
          {selectedSubtasks.size > 0 && (
            <button
              onClick={handleCreateSubtasks}
              className="px-8 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Criando...
                </>
              ) : (
                `Criar ${selectedSubtasks.size} Subtarefa${selectedSubtasks.size > 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubtaskSuggestionsModal;
