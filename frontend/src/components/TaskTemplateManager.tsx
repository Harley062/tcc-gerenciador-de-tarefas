import React, { useState, useEffect } from 'react';
import { Task } from '../store/taskStore';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  priority: Task['priority'];
  tags: string[];
  estimated_duration?: number;
}

interface TaskTemplateManagerProps {
  onUseTemplate: (template: TaskTemplate) => void;
  onClose: () => void;
}

const TaskTemplateManager: React.FC<TaskTemplateManagerProps> = ({ onUseTemplate, onClose }) => {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({
    name: '',
    description: '',
    priority: 'medium',
    tags: [],
    estimated_duration: undefined,
  });

  useEffect(() => {
    const saved = localStorage.getItem('task_templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      const defaultTemplates: TaskTemplate[] = [
        {
          id: '1',
          name: 'Reunião',
          description: 'Reunião com a equipe',
          priority: 'medium',
          tags: ['reunião', 'equipe'],
          estimated_duration: 60,
        },
        {
          id: '2',
          name: 'Bug Fix',
          description: 'Corrigir bug reportado',
          priority: 'high',
          tags: ['bug', 'desenvolvimento'],
          estimated_duration: 120,
        },
        {
          id: '3',
          name: 'Revisão de Código',
          description: 'Revisar pull request',
          priority: 'medium',
          tags: ['code-review', 'desenvolvimento'],
          estimated_duration: 30,
        },
      ];
      setTemplates(defaultTemplates);
      localStorage.setItem('task_templates', JSON.stringify(defaultTemplates));
    }
  }, []);

  const saveTemplates = (newTemplates: TaskTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('task_templates', JSON.stringify(newTemplates));
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name) return;

    const template: TaskTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      description: newTemplate.description || '',
      priority: newTemplate.priority || 'medium',
      tags: newTemplate.tags || [],
      estimated_duration: newTemplate.estimated_duration,
    };

    saveTemplates([...templates, template]);
    setShowCreateForm(false);
    setNewTemplate({
      name: '',
      description: '',
      priority: 'medium',
      tags: [],
      estimated_duration: undefined,
    });
  };

  const handleDeleteTemplate = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id));
  };

  const handleUseTemplate = (template: TaskTemplate) => {
    onUseTemplate(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 dark:border-gray-700/50 animate-scale-in">
        <div className="px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            Templates de Tarefas
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 px-4 py-4 bg-primary-50 dark:bg-primary-900/20 border-2 border-dashed border-primary-200 dark:border-primary-700/50 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-all duration-300 font-medium flex items-center justify-center gap-2 group"
            >
              <div className="p-2 bg-primary-100 dark:bg-primary-800/50 rounded-full group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              Criar Novo Template
            </button>
          ) : (
            <div className="mb-6 bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm animate-slide-up">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
                Novo Template
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Template</label>
                  <input
                    type="text"
                    placeholder="Ex: Reunião Semanal"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                  <textarea
                    placeholder="Descreva o propósito deste template..."
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridade</label>
                    <select
                      value={newTemplate.priority}
                      onChange={(e) => setNewTemplate({ ...newTemplate, priority: e.target.value as Task['priority'] })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="low">🟢 Baixa</option>
                      <option value="medium">🟡 Média</option>
                      <option value="high">🟠 Alta</option>
                      <option value="urgent">🔴 Urgente</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duração Estimada (min)</label>
                    <input
                      type="number"
                      placeholder="Ex: 60"
                      value={newTemplate.estimated_duration || ''}
                      onChange={(e) => setNewTemplate({ ...newTemplate, estimated_duration: parseInt(e.target.value) || undefined })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreateTemplate}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Salvar Template
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-700/50 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 group-hover:from-primary-500 group-hover:to-primary-600 transition-all"></div>
                
                <div className="flex justify-between items-start mb-3 pl-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-4 group-hover:translate-x-0">
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="px-4 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 shadow-lg shadow-primary-500/20 transition-all hover:scale-105 text-sm font-bold flex items-center gap-1"
                      title="Usar template"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Usar
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Deletar template"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pl-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                    template.priority === 'urgent' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' :
                    template.priority === 'high' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' :
                    template.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' :
                    'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  }`}>
                    {template.priority === 'urgent' ? '🔴 Urgente' :
                     template.priority === 'high' ? '🟠 Alta' :
                     template.priority === 'medium' ? '🟡 Média' :
                     '🟢 Baixa'}
                  </span>

                  {template.estimated_duration && (
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {template.estimated_duration}min
                    </span>
                  )}

                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {templates.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Nenhum template encontrado</h3>
                <p className="text-gray-500 dark:text-gray-400">Crie seu primeiro template para agilizar seu trabalho!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskTemplateManager;
