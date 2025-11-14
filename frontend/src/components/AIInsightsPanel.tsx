import React, { useState } from 'react';
import { aiApi, SubtaskSuggestion, Dependency, SchedulingSuggestion } from '../services/aiApi';
import { Task } from '../store/taskStore';
import ApplyAISuggestionsModal from './ApplyAISuggestionsModal';

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
  const [scheduling, setScheduling] = useState<SchedulingSuggestion | null>(null);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSubtasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const suggestions = await aiApi.suggestSubtasks(task.title, task.description);
      setSubtasks(suggestions);
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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">🤖 Insights de IA</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowApplyModal(true)}
                className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded hover:from-purple-600 hover:to-blue-600 transition-colors text-sm font-medium"
              >
                ✨ Aplicar com IA
              </button>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
          </div>

        <div className="flex border-b">
          <button
            className={`px-4 py-2 ${activeTab === 'subtasks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('subtasks')}
          >
            📋 Subtarefas
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'scheduling' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('scheduling')}
          >
            📅 Agendamento
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'dependencies' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('dependencies')}
          >
            🔗 Dependências
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Analisando com IA...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && activeTab === 'subtasks' && (
            <div>
              <p className="text-gray-600 mb-4">
                A IA sugeriu {subtasks.length} subtarefas para dividir esta tarefa:
              </p>
              {subtasks.length === 0 ? (
                <p className="text-gray-500 italic">Nenhuma sugestão disponível</p>
              ) : (
                <div className="space-y-3">
                  {subtasks.map((subtask, index) => (
                    <div key={index} className="border rounded p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold">{subtask.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{subtask.description}</p>
                        </div>
                        <span className="text-sm text-gray-500 ml-2">
                          ⏱️ {subtask.estimated_duration}min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {subtasks.length > 0 && onCreateSubtasks && (
                <button
                  onClick={() => onCreateSubtasks(subtasks)}
                  className="mt-4 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                  Criar Todas as Subtarefas
                </button>
              )}
            </div>
          )}

          {!loading && !error && activeTab === 'scheduling' && scheduling && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Sugestão de Agendamento</h4>
                <p className="text-lg text-blue-800 mb-2">{scheduling.suggestion}</p>
                <p className="text-sm text-blue-700">
                  📅 {new Date(scheduling.suggested_time).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-4">
                <p className="text-sm text-gray-700">
                  <strong>Motivo:</strong> {scheduling.reason}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Confiança: {(scheduling.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'dependencies' && (
            <div>
              <p className="text-gray-600 mb-4">
                {dependencies.length > 0
                  ? `A IA detectou ${dependencies.length} possível(is) dependência(s):`
                  : 'Nenhuma dependência detectada para esta tarefa.'}
              </p>
              {dependencies.length > 0 && (
                <div className="space-y-3">
                  {dependencies.map((dep, index) => (
                    <div key={index} className="border rounded p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{dep.task_title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{dep.reason}</p>
                          <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-xs rounded">
                            {dep.relationship === 'blocks' ? '🚫 Bloqueia' : '🔗 Relacionada'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 ml-2">
                          {(dep.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

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
  </>
  );
};

export default AIInsightsPanel;
