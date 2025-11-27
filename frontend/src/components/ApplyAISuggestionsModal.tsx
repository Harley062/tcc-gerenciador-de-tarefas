import React, { useState, useEffect } from 'react';
import { aiApi, SubtaskSuggestion, SentimentAnalysis, DurationEstimate } from '../services/aiApi';
import apiService from '../services/api';
import { Task } from '../store/taskStore';
import { useToast } from './ToastContainer';

interface ApplyAISuggestionsModalProps {
  task: Task;
  onClose: () => void;
  onApplied: () => void;
}

interface AISuggestions {
  sentiment: SentimentAnalysis | null;
  duration: DurationEstimate | null;
  subtasks: SubtaskSuggestion[];
}

interface SelectedSuggestions {
  priority: boolean;
  estimatedDuration: boolean;
  subtasks: boolean[];
}

const ApplyAISuggestionsModal: React.FC<ApplyAISuggestionsModalProps> = ({ task, onClose, onApplied }) => {
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [suggestions, setSuggestions] = useState<AISuggestions>({
    sentiment: null,
    duration: null,
    subtasks: [],
  });
  const [selected, setSelected] = useState<SelectedSuggestions>({
    priority: true,
    estimatedDuration: true,
    subtasks: [],
  });
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const taskText = `${task.title}${task.description ? ' ' + task.description : ''}`;

      const [sentimentResult, durationResult, subtasksResult] = await Promise.all([
        aiApi.analyzeSentiment(taskText).catch(() => null),
        aiApi.estimateDuration(task.title, task.description).catch(() => null),
        aiApi.suggestSubtasks(task.title, task.description).catch(() => ({ subtasks: [], provider: 'unknown' })),
      ]);

      setSuggestions({
        sentiment: sentimentResult,
        duration: durationResult,
        subtasks: subtasksResult.subtasks,
      });

      setProvider(subtasksResult.provider);

      setSelected({
        priority: !!sentimentResult,
        estimatedDuration: !!durationResult,
        subtasks: subtasksResult.subtasks.map(() => true),
      });
    } catch (err) {
      setError('Falha ao carregar sugestões de IA');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const updates: any = {};

      if (selected.priority && suggestions.sentiment) {
        const priorityMap: { [key: string]: string } = {
          low: 'low',
          medium: 'medium',
          high: 'high',
          urgent: 'urgent',
        };
        const mappedPriority = priorityMap[suggestions.sentiment.priority.toLowerCase()] || 'medium';
        updates.priority = mappedPriority;
      }

      if (selected.estimatedDuration && suggestions.duration) {
        updates.estimated_duration = suggestions.duration.estimated_duration;
      }

      if (Object.keys(updates).length > 0) {
        await apiService.updateTask(task.id, updates);
      }

      const selectedSubtasks = suggestions.subtasks.filter((_, index) => selected.subtasks[index]);
      for (const subtask of selectedSubtasks) {
        await apiService.createSubtask(task.id, {
          title: subtask.title,
          description: subtask.description,
          estimated_duration: subtask.estimated_duration,
        });
      }

      showSuccess('Sugestões aplicadas com sucesso!');
      onApplied();
      onClose();
    } catch (err) {
      console.error(err);
      showError('Falha ao aplicar sugestões');
    } finally {
      setApplying(false);
    }
  };

  const toggleSubtask = (index: number) => {
    setSelected((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((val, i) => (i === index ? !val : val)),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-white/20 dark:border-gray-700/50 animate-scale-in flex flex-col">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-purple-600 to-blue-600 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <span className="text-xl text-white">✨</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Aplicar Sugestões de IA</h2>
              {provider && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    provider === 'gpt4' ? 'bg-green-400/20 text-green-100 border border-green-400/30' :
                    provider === 'llama' ? 'bg-blue-400/20 text-blue-100 border border-blue-400/30' :
                    'bg-yellow-400/20 text-yellow-100 border border-yellow-400/30'
                  }`}>
                    {provider === 'gpt4' ? 'GPT-4' :
                     provider === 'llama' ? 'Llama' :
                     'Heurística'}
                  </span>
                </div>
              )}
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
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Analisando tarefa com IA...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl p-6 backdrop-blur-sm text-center">
              <p className="text-red-800 dark:text-red-200 mb-4">{error}</p>
              <button
                onClick={loadSuggestions}
                className="px-6 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              <div className="bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">{task.title}</h3>
                {task.description && (
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{task.description}</p>
                )}
              </div>

              {suggestions.sentiment && (
                <div className="bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                  <label className="flex items-start gap-4 cursor-pointer">
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={selected.priority}
                        onChange={(e) => setSelected({ ...selected, priority: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 dark:text-white text-lg mb-2">Prioridade Sugerida</div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold shadow-sm ${
                          suggestions.sentiment.priority === 'urgent' ? 'bg-red-100 text-red-800 border border-red-200' :
                          suggestions.sentiment.priority === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          suggestions.sentiment.priority === 'medium' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {suggestions.sentiment.priority.toUpperCase()}
                        </span>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {(suggestions.sentiment.confidence * 100).toFixed(0)}% confiança
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex gap-4">
                        <span>Sentimento: <span className="font-medium text-gray-700 dark:text-gray-300">{suggestions.sentiment.sentiment}</span></span>
                        <span>Urgência: <span className="font-medium text-gray-700 dark:text-gray-300">{suggestions.sentiment.urgency_score.toFixed(1)}</span></span>
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {suggestions.duration && (
                <div className="bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                  <label className="flex items-start gap-4 cursor-pointer">
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={selected.estimatedDuration}
                        onChange={(e) => setSelected({ ...selected, estimatedDuration: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 dark:text-white text-lg mb-2">Duração Estimada</div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                          {suggestions.duration.estimated_duration} <span className="text-sm font-normal text-gray-500">min</span>
                        </span>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {(suggestions.duration.confidence * 100).toFixed(0)}% confiança
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              )}

              <div className="bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4">
                <div className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-lg">
                  <span className="text-xl">📋</span>
                  <span>Subtarefas Sugeridas</span>
                  {suggestions.subtasks.length > 0 && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                      {suggestions.subtasks.length}
                    </span>
                  )}
                </div>
                
                {suggestions.subtasks.length > 0 ? (
                  <div className="space-y-3">
                    {suggestions.subtasks.map((subtask, index) => (
                      <label key={index} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selected.subtasks[index] 
                          ? 'bg-purple-50/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' 
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300'
                      }`}>
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={selected.subtasks[index]}
                            onChange={() => toggleSubtask(index)}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 dark:text-white">{subtask.title}</div>
                          {subtask.description && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtask.description}</div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {subtask.estimated_duration} min
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="text-4xl mb-2">🤔</div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Nenhuma subtarefa sugerida</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Tente adicionar mais detalhes à descrição da tarefa
                    </p>
                  </div>
                )}
              </div>

              {!suggestions.sentiment && !suggestions.duration && suggestions.subtasks.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Nenhuma sugestão disponível para esta tarefa.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors font-medium"
            disabled={applying}
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={loading || applying || (!selected.priority && !selected.estimatedDuration && !selected.subtasks.some(Boolean))}
            className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            {applying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Aplicando...
              </>
            ) : (
              'Aplicar Selecionadas'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplyAISuggestionsModal;
