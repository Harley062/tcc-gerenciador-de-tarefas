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
        aiApi.suggestSubtasks(task.title, task.description).catch(() => []),
      ]);

      setSuggestions({
        sentiment: sentimentResult,
        duration: durationResult,
        subtasks: subtasksResult,
      });

      setSelected({
        priority: !!sentimentResult,
        estimatedDuration: !!durationResult,
        subtasks: subtasksResult.map(() => true),
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-500 to-blue-500">
          <h2 className="text-xl font-bold text-white">✨ Aplicar Sugestões de IA</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Analisando tarefa com IA...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
              {error}
              <button
                onClick={loadSuggestions}
                className="ml-4 text-red-600 hover:text-red-800 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Tarefa: {task.title}</h3>
                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}
              </div>

              {suggestions.sentiment && (
                <div className="border rounded-lg p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.priority}
                      onChange={(e) => setSelected({ ...selected, priority: e.target.checked })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">Prioridade Sugerida</div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          suggestions.sentiment.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          suggestions.sentiment.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          suggestions.sentiment.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {suggestions.sentiment.priority}
                        </span>
                        <span className="ml-2">
                          (Confiança: {(suggestions.sentiment.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Sentimento: {suggestions.sentiment.sentiment} | Urgência: {suggestions.sentiment.urgency_score.toFixed(1)}
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {suggestions.duration && (
                <div className="border rounded-lg p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.estimatedDuration}
                      onChange={(e) => setSelected({ ...selected, estimatedDuration: e.target.checked })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">Duração Estimada</div>
                      <div className="text-sm text-gray-600 mt-1">
                        ⏱️ {suggestions.duration.estimated_duration} minutos
                        <span className="ml-2 text-xs text-gray-500">
                          (Confiança: {(suggestions.duration.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {suggestions.subtasks.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="font-semibold text-gray-800 mb-3">
                    Subtarefas Sugeridas ({suggestions.subtasks.length})
                  </div>
                  <div className="space-y-2">
                    {suggestions.subtasks.map((subtask, index) => (
                      <label key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={selected.subtasks[index]}
                          onChange={() => toggleSubtask(index)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{subtask.title}</div>
                          <div className="text-xs text-gray-600 mt-1">{subtask.description}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            ⏱️ {subtask.estimated_duration}min
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {!suggestions.sentiment && !suggestions.duration && suggestions.subtasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma sugestão disponível para esta tarefa.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={applying}
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={loading || applying || (!selected.priority && !selected.estimatedDuration && !selected.subtasks.some(Boolean))}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying ? 'Aplicando...' : 'Aplicar Selecionadas'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplyAISuggestionsModal;
