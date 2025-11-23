import React, { useState } from 'react';
import apiService from '../services/api';
import { useToast } from './ToastContainer';
import { aiApi } from '../services/aiApi';

interface TaskCreateModalProps {
  onClose: () => void;
  onCreated: (taskId: string) => void;
}

const TaskCreateModal: React.FC<TaskCreateModalProps> = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as 'todo' | 'in_progress' | 'done' | 'cancelled',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_date: '',
    estimated_duration: 60,
    tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [loadingAISuggestions, setLoadingAISuggestions] = useState(false);
  const { showSuccess, showError, showInfo } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const taskData: any = {
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        estimated_duration: formData.estimated_duration,
        tags: formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      };

      const response = await apiService.createTaskStructured(taskData);
      setCreatedTaskId(response.id);
      showSuccess('Tarefa criada com sucesso!');
      showInfo('💡 Clique em "Obter Sugestões de IA" para receber sugestões de subtarefas');
    } catch (error: any) {
      console.error('Failed to create task:', error);
      const errorMessage = error.response?.data?.detail || 'Falha ao criar tarefa';
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleGetAISuggestions = async () => {
    if (!createdTaskId) return;

    setLoadingAISuggestions(true);
    try {
      showInfo('Gerando sugestões de subtarefas com IA...');
      const response = await aiApi.suggestSubtasks(formData.title, formData.description);
      
      if (response.subtasks && response.subtasks.length > 0) {
        showSuccess(`${response.subtasks.length} sugestões de subtarefas geradas!`);
        
        for (const subtask of response.subtasks) {
          await apiService.createSubtask(createdTaskId, {
            title: subtask.title,
            description: subtask.description,
            estimated_duration: subtask.estimated_duration || 30,
          });
        }
        
        showSuccess('Subtarefas criadas com sucesso!');
        onCreated(createdTaskId);
        onClose();
      } else {
        showInfo('Nenhuma sugestão de subtarefa foi gerada');
      }
    } catch (error: any) {
      console.error('Failed to get AI suggestions:', error);
      const errorMessage = error.response?.data?.detail || 'Falha ao obter sugestões de IA';
      showError(errorMessage);
    } finally {
      setLoadingAISuggestions(false);
    }
  };

  const handleFinishWithoutAI = () => {
    if (createdTaskId) {
      onCreated(createdTaskId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-green-500">
          <h2 className="text-xl font-bold text-white">
            {createdTaskId ? '✨ Tarefa Criada!' : '➕ Nova Tarefa'}
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
            ✕
          </button>
        </div>

        {!createdTaskId ? (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Ex: Desenvolver nova funcionalidade"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Descreva os detalhes da tarefa..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="todo">A Fazer</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="done">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Realização
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duração Estimada (minutos)
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) || 0 })}
                    min="15"
                    step="15"
                    placeholder="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="trabalho, urgente, projeto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </form>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Tarefa criada com sucesso!</h3>
              <p className="text-sm text-green-700">
                Sua tarefa &quot;{formData.title}&quot; foi criada. Deseja obter sugestões de subtarefas usando IA?
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Sugestões de IA</h4>
              <p className="text-sm text-blue-700 mb-3">
                O GPT-4 pode analisar o título e descrição da sua tarefa para sugerir subtarefas relevantes,
                ajudando você a organizar melhor o trabalho.
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Baseado no título: &quot;{formData.title}&quot;</li>
                {formData.description && <li>• Considerando a descrição fornecida</li>}
                <li>• Subtarefas serão criadas automaticamente</li>
              </ul>
            </div>
          </div>
        )}

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          {!createdTaskId ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !formData.title.trim()}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Criando...' : 'Criar Tarefa'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleFinishWithoutAI}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={loadingAISuggestions}
              >
                Finalizar Sem IA
              </button>
              <button
                onClick={handleGetAISuggestions}
                disabled={loadingAISuggestions}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingAISuggestions ? 'Gerando...' : '✨ Obter Sugestões de IA'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCreateModal;
