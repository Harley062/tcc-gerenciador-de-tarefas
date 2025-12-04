import React, { useState } from 'react';
import { aiApi, SubtaskSuggestion, Dependency, SchedulingSuggestion } from '../services/aiApi';
import api from '../services/api';
import { Task } from '../store/taskStore';
import ApplyAISuggestionsModal from './ApplyAISuggestionsModal';
import { useToast } from './ToastContainer';

interface AIInsightsPanelProps {
  task: Task;
  onClose: () => void;
  onCreateSubtasks?: (subtasks: SubtaskSuggestion[]) => void;
  onTaskUpdated?: () => void;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ task, onClose, onCreateSubtasks, onTaskUpdated }) => {
  const [activeTab, setActiveTab] = useState<'subtasks' | 'scheduling' | 'dependencies'>('subtasks');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subtasks, setSubtasks] = useState<SubtaskSuggestion[]>([]);
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [scheduling, setScheduling] = useState<SchedulingSuggestion | null>(null);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applyingSchedule, setApplyingSchedule] = useState(false);
  const { showSuccess, showError } = useToast();

  const loadSubtasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiApi.suggestSubtasks(task.title, task.description);
      setSubtasks(result.subtasks);
    } catch (err) {
      setError('Falha ao gerar sugestões de subtarefas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduling = async () => {
    setLoading(true);
    setError(null);
    try {
      const suggestion = await aiApi.suggestScheduling(task.id);
      setScheduling(suggestion);
    } catch (err) {
      setError('Falha ao gerar sugestão de agendamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    setLoading(true);
    setError(null);
    try {
      const deps = await aiApi.detectDependencies(task.id);
      setDependencies(deps);
    } catch (err) {
      setError('Falha ao detectar dependências');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyScheduling = async () => {
    if (!scheduling) return;

    setApplyingSchedule(true);
    try {
      await api.updateTask(task.id, {
        due_date: scheduling.suggested_time
      });

      if (onTaskUpdated) {
        onTaskUpdated();
      }

      showSuccess('Agendamento aplicado com sucesso!');

      onClose();
    } catch (err) {
      console.error('Failed to apply scheduling:', err);
      showError('Falha ao aplicar agendamento');
    } finally {
      setApplyingSchedule(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'subtasks' && subtasks.length === 0) {
      loadSubtasks();
    } else if (activeTab === 'scheduling' && !scheduling) {
      loadScheduling();
    } else if (activeTab === 'dependencies' && dependencies.length === 0) {
      loadDependencies();
    }
  }, [activeTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="w-full max-w-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-xl">✨</span>
              Insights IA
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSubtasks}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all duration-200 disabled:opacity-50"
                title="Atualizar insights"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                title="Fechar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {error && (
        <div className="mb-6 p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700 opacity-25"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 border-r-primary-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-500 animate-pulse" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Analisando seus dados...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex p-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-xl backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('subtasks')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'subtasks'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              📋 Subtarefas
            </button>
            <button
              onClick={() => setActiveTab('scheduling')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'scheduling'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              📅 Agendamento
            </button>
            <button
              onClick={() => setActiveTab('dependencies')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'dependencies'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              🔗 Dependências
            </button>
          </div>

          <div className="min-h-[300px]">
            {activeTab === 'subtasks' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Sugestões para dividir esta tarefa em etapas menores:
                  </p>
                  <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2 py-1 rounded-full">
                    {subtasks.length} sugestões
                  </span>
                </div>
                
                {subtasks.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">Nenhuma sugestão disponível no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subtasks.map((subtask, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {subtask.title}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                              {subtask.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                              <span>⏱️</span> {subtask.estimated_duration}min
                            </span>
                            <button
                              onClick={async () => {
                                try {
                                  setCreatingIndex(index);
                                  await api.createSubtask(task.id, {
                                    title: subtask.title,
                                    description: subtask.description,
                                    estimated_duration: subtask.estimated_duration,
                                    status: 'todo',
                                    priority: 'medium',
                                  });
                                  setSubtasks((prev) => prev.filter((_, i) => i !== index));
                                  if (onTaskUpdated) onTaskUpdated();
                                  showSuccess('Subtarefa criada com sucesso!');
                                } catch (err) {
                                  console.error('Failed to create subtask:', err);
                                  setError('Falha ao criar subtarefa');
                                } finally {
                                  setCreatingIndex(null);
                                }
                              }}
                              disabled={creatingIndex !== null}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {creatingIndex === index ? 'Criando...' : 'Adicionar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {subtasks.length > 0 && onCreateSubtasks && (
                  <button
                    onClick={() => onCreateSubtasks(subtasks)}
                    className="w-full mt-4 py-3 bg-white dark:bg-gray-800 border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-xl font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Adicionar Todas as Subtarefas
                  </button>
                )}
              </div>
            )}

            {activeTab === 'scheduling' && scheduling && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  
                  <div className="relative z-10">
                    <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                      <span className="text-2xl">💡</span> Sugestão de Agendamento
                    </h4>
                    <p className="text-lg text-blue-800 dark:text-blue-200 mb-4 leading-relaxed font-medium">
                      {scheduling.suggestion}
                    </p>
                    <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-blue-200 dark:border-blue-700/50">
                      <span className="text-xl">📅</span>
                      <span className="font-bold text-blue-900 dark:text-blue-100">
                        {new Date(scheduling.suggested_time).toLocaleString('pt-BR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Por que esta data?</h5>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {scheduling.reason}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-2 flex-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                        style={{ width: `${scheduling.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {(scheduling.confidence * 100).toFixed(0)}% de confiança
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleApplyScheduling}
                  disabled={applyingSchedule}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {applyingSchedule ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Aplicando Agendamento...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Aceitar Sugestão
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'dependencies' && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {dependencies.length > 0
                    ? `A IA detectou ${dependencies.length} possível(is) dependência(s) que podem impactar esta tarefa:`
                    : 'Nenhuma dependência crítica detectada para esta tarefa.'}
                </p>
                
                {dependencies.length > 0 && (
                  <div className="space-y-3">
                    {dependencies.map((dep, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                dep.relationship === 'blocks' 
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              }`}>
                                {dep.relationship === 'blocks' ? 'Bloqueia' : 'Relacionada'}
                              </span>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{dep.task_title}</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {dep.reason}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="radial-progress text-xs font-bold text-indigo-600 dark:text-indigo-400" style={{"--value": dep.confidence * 100, "--size": "2rem"} as any}>
                              {(dep.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showApplyModal && (
        <ApplyAISuggestionsModal
          task={task}
          onClose={() => setShowApplyModal(false)}
          onApplied={() => {
            if (onTaskUpdated) {
              onTaskUpdated();
            }
          }}
        />
      )}
        </div>
      </div>
    </div>
  );
};

export default AIInsightsPanel;
