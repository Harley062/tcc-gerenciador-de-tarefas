import React, { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import SubtaskSuggestionsModal from './SubtaskSuggestionsModal';

interface NaturalLanguageInputProps {
  onTaskCreated?: () => void;
}

const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({ onTaskCreated }) => {
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

      // Show subtask suggestions modal after a short delay
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          Criar Tarefa com Linguagem Natural
        </h2>

        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua tarefa em linguagem natural..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>

        {preview && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">Tarefa Criada!</h3>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium">{preview.title}</p>
              {preview.description && <p className="text-gray-600 dark:text-gray-400">{preview.description}</p>}
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                  {preview.priority}
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-xs">
                  {preview.status}
                </span>
                {preview.due_date && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs">
                    {new Date(preview.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Exemplos:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => setInput(example)}
                className="text-left px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subtask Suggestions Modal */}
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
