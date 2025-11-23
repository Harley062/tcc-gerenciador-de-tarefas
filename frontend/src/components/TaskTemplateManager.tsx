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
    // Carregar templates do localStorage
    const saved = localStorage.getItem('task_templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      // Templates padrão
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Templates de Tarefas</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Criar Novo Template */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Criar Novo Template
            </button>
          ) : (
            <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Novo Template</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nome do template"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 input"
                />
                <textarea
                  placeholder="Descrição"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  className="w-full px-3 py-2 input"
                  rows={2}
                />
                <select
                  value={newTemplate.priority}
                  onChange={(e) => setNewTemplate({ ...newTemplate, priority: e.target.value as Task['priority'] })}
                  className="w-full px-3 py-2 input"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
                <input
                  type="number"
                  placeholder="Duração estimada (minutos)"
                  value={newTemplate.estimated_duration || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, estimated_duration: parseInt(e.target.value) || undefined })}
                  className="w-full px-3 py-2 input"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTemplate}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Templates */}
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors text-sm font-medium"
                      title="Usar template"
                    >
                      Usar
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Deletar template"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    template.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                    template.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                    template.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  }`}>
                    {template.priority === 'urgent' ? '🔴 Urgente' :
                     template.priority === 'high' ? '🟠 Alta' :
                     template.priority === 'medium' ? '🟡 Média' :
                     '🟢 Baixa'}
                  </span>

                  {template.estimated_duration && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                      ⏱️ {template.estimated_duration}min
                    </span>
                  )}

                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {templates.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Nenhum template criado ainda. Crie seu primeiro template acima!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskTemplateManager;
