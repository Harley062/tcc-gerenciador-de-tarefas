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
      // Select all by default
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

      // Create all selected subtasks
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 glass border-b border-gray-200 dark:border-gray-700 p-6 -m-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 7H7v6h6V7z" />
                  <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                </svg>
                Sugestões de Subtarefas
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                A IA sugeriu algumas subtarefas para: <span className="font-medium">{taskTitle}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 -mt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Gerando sugestões de subtarefas...</p>
            </div>
          ) : error ? (
            <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg p-4">
              <p className="text-danger-800 dark:text-danger-200">{error}</p>
              <button
                onClick={loadSuggestions}
                className="mt-3 btn btn-primary"
              >
                Tentar Novamente
              </button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400">Nenhuma sugestão de subtarefa disponível.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selecione as subtarefas que deseja criar ({selectedSubtasks.size} de {suggestions.length} selecionadas)
                </p>
                <button
                  onClick={() => {
                    if (selectedSubtasks.size === suggestions.length) {
                      setSelectedSubtasks(new Set());
                    } else {
                      setSelectedSubtasks(new Set(suggestions.map((_, i) => i)));
                    }
                  }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  {selectedSubtasks.size === suggestions.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </button>
              </div>

              <div className="space-y-3">
                {suggestions.map((subtask, index) => (
                  <div
                    key={index}
                    onClick={() => toggleSubtask(index)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedSubtasks.has(index)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <input
                          type="checkbox"
                          checked={selectedSubtasks.has(index)}
                          onChange={() => toggleSubtask(index)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {subtask.title}
                        </h3>
                        {subtask.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {subtask.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
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

        <div className="sticky bottom-0 glass border-t border-gray-200 dark:border-gray-700 p-6 -m-6 mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isCreating}
          >
            {selectedSubtasks.size === 0 ? 'Fechar' : 'Cancelar'}
          </button>
          {selectedSubtasks.size > 0 && (
            <button
              onClick={handleCreateSubtasks}
              className="btn btn-primary"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
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
