import React, { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import SubtaskSuggestionsModal from './SubtaskSuggestionsModal';

interface NaturalLanguageInputProps {
  onTaskCreated?: () => void;
  onClose?: () => void;
}

const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({ onTaskCreated, onClose }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [createdTask, setCreatedTask] = useState<any>(null);
  const createTask = useTaskStore((state) => state.createTask);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const task = await createTask(input);
      setPreview(task);
      setCreatedTask(task);
      setInput('');

      setTimeout(() => {
        setShowSubtaskModal(true);
      }, 500);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSubtaskModal = () => {
    setShowSubtaskModal(false);
    setPreview(null);
    setCreatedTask(null);
    onTaskCreated?.();
  };

  const examples = [
    'Reunião com cliente amanhã às 14h',
    'Urgente: Corrigir bug em produção até o fim do dia',
    'Revisar pull request #123 - alta prioridade',
    'Comprar mantimentos para a semana',
    'Preparar apresentação do TCC para segunda-feira',
    'Ligar para médico e marcar consulta - importante',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/20 dark:border-gray-700/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-2xl">✨</span>
              Criar Tarefa com IA
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                title="Fechar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-3">
              <div className="flex-1 relative group/input">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl opacity-0 group-hover/input:opacity-20 transition-opacity duration-300 blur-sm"></div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ex: Reunião de projeto amanhã às 14h com a equipe..."
                  className="w-full px-6 py-4 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 text-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm transition-all relative z-10"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <span>Criar Mágica</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {preview && (
            <div className="mb-8 p-6 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl animate-slide-up backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-800 dark:text-green-300 text-lg mb-2">Tarefa Criada com Sucesso!</h3>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 border border-green-100 dark:border-green-900/30">
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{preview.title}</p>
                    {preview.description && (
                      <p className="text-gray-600 dark:text-gray-400 mt-1">{preview.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        preview.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        preview.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        preview.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {preview.priority}
                      </span>
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider">
                        {preview.status}
                      </span>
                      {preview.due_date && (
                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(preview.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Exemplos de uso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setInput(example)}
                  className="text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/30 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 text-sm text-gray-600 dark:text-gray-300 transition-all hover:shadow-sm group"
                >
                  <span className="group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">"{example}"</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showSubtaskModal && createdTask && (
        <SubtaskSuggestionsModal
          taskId={createdTask.id}
          taskTitle={createdTask.title}
          taskDescription={createdTask.description}
          onClose={handleCloseSubtaskModal}
          onSubtasksCreated={handleCloseSubtaskModal}
        />
      )}
    </div>
  );
};

export default NaturalLanguageInput;
