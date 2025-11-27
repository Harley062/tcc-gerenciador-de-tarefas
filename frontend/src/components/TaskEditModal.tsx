import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, normalizeStatus, normalizePriority } from '../store/taskStore';
import apiService from '../services/api';
import { useToast } from './ToastContainer';
import SubtaskSuggestionsModal from './SubtaskSuggestionsModal';

const toLocalDatetimeString = (isoDate: string | undefined): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toISOWithBrazilTimezone = (localDatetime: string): string => {
  if (!localDatetime) return '';
  return `${localDatetime}:00-03:00`;
};

interface TaskEditModalProps {
  task: Task;
  onClose: () => void;
  onSaved: () => void;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    status: normalizeStatus(task.status) as TaskStatus,
    priority: normalizePriority(task.priority) as TaskPriority,
    due_date: toLocalDatetimeString(task.due_date),
    tags: (task.tags || []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates: any = {
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date ? toISOWithBrazilTimezone(formData.due_date) : undefined,
        tags: formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      };

      await apiService.updateTask(task.id, updates);
      showSuccess('Tarefa atualizada com sucesso!');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
      showError('Falha ao atualizar tarefa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showSubtaskModal && (
        <SubtaskSuggestionsModal
          taskId={task.id}
          taskTitle={formData.title}
          taskDescription={formData.description}
          onClose={() => setShowSubtaskModal(false)}
          onSubtasksCreated={() => {
            setShowSubtaskModal(false);
            showSuccess('Subtarefas criadas com sucesso!');
            onSaved();
          }}
        />
      )}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/20 dark:border-gray-700/50 animate-slide-up flex flex-col">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center bg-gradient-to-r from-primary-600 to-primary-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <span className="text-xl text-white">✏️</span>
              </div>
              <h2 className="text-xl font-bold text-white">Editar Tarefa</h2>
            </div>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
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
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Data de Vencimento
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
          </div>

          <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => setShowSubtaskModal(true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              disabled={saving}
            >
              <span className="text-lg">✨</span>
              Sugestões de Subtarefas
            </button>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors font-medium"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !formData.title.trim()}
                className="flex-1 sm:flex-none px-8 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {saving ? (
                  <span className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Salvando...
                  </span>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskEditModal;
