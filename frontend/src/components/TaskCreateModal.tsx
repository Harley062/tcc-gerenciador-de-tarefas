import React, { useState } from 'react';
import apiService from '../services/api';
import { useToast } from './ToastContainer';
import { aiApi } from '../services/aiApi';
import { TaskStatus, TaskPriority } from '../store/taskStore';

const toISOWithBrazilTimezone = (localDatetime: string): string => {
  if (!localDatetime) return '';
  return `${localDatetime}:00-03:00`;
};

interface TaskCreateModalProps {
  onClose: () => void;
  onCreated: (taskId: string) => void;
}

const TaskCreateModal: React.FC<TaskCreateModalProps> = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'a_fazer' as TaskStatus,
    priority: 'media' as TaskPriority,
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
        due_date: formData.due_date ? toISOWithBrazilTimezone(formData.due_date) : undefined,
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/20 dark:border-gray-700/50 animate-slide-up flex flex-col">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center bg-gradient-to-r from-primary-600 to-primary-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <span className="text-xl text-white">
                {createdTaskId ? '✨' : '➕'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {createdTaskId ? 'Tarefa Criada!' : 'Nova Tarefa'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!createdTaskId ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Ex: Desenvolver nova funcionalidade"
                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Descreva os detalhes da tarefa..."
                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none appearance-none"
                      >
                        <option value="a_fazer">A Fazer</option>
                        <option value="em_progresso">Em Progresso</option>
                        <option value="concluida">Concluída</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                      <div className="absolute right-4 top-3.5 pointer-events-none text-gray-500">▼</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Prioridade
                    </label>
                    <div className="relative">
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none appearance-none"
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                      <div className="absolute right-4 top-3.5 pointer-events-none text-gray-500">▼</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Data de Realização
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Duração Estimada (min)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_duration}
                      onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) || 0 })}
                      min="15"
                      step="15"
                      placeholder="60"
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="trabalho, urgente, projeto (separadas por vírgula)"
                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="p-6 space-y-6">
              <div className="bg-green-50/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full text-green-600 dark:text-green-400">
                    ✓
                  </div>
                  <h3 className="font-bold text-green-800 dark:text-green-300 text-lg">Tarefa criada com sucesso!</h3>
                </div>
                <p className="text-green-700 dark:text-green-400 ml-11">
                  Sua tarefa <span className="font-semibold">"{formData.title}"</span> foi criada. Deseja obter sugestões de subtarefas usando IA?
                </p>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400">
                    💡
                  </div>
                  <h4 className="font-bold text-blue-800 dark:text-blue-300 text-lg">Sugestões de IA</h4>
                </div>
                <div className="ml-11 space-y-3">
                  <p className="text-blue-700 dark:text-blue-400">
                    O GPT-4 pode analisar o título e descrição da sua tarefa para sugerir subtarefas relevantes,
                    ajudando você a organizar melhor o trabalho.
                  </p>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-2 bg-white/40 dark:bg-black/20 p-4 rounded-xl">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                      Análise baseada no título: "{formData.title}"
                    </li>
                    {formData.description && (
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                        Considerando a descrição fornecida
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                      Geração automática de subtarefas
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-xl flex justify-end gap-3">
          {!createdTaskId ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors font-medium"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !formData.title.trim()}
                className="px-8 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Criando...
                  </span>
                ) : (
                  'Criar Tarefa'
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleFinishWithoutAI}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors font-medium"
                disabled={loadingAISuggestions}
              >
                Finalizar Sem IA
              </button>
              <button
                onClick={handleGetAISuggestions}
                disabled={loadingAISuggestions}
                className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loadingAISuggestions ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Gerando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    ✨ Obter Sugestões
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCreateModal;
