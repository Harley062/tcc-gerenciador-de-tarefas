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
    'Urgent: Fix production bug by end of day',
    'Review pull request #123 - high priority',
    'Comprar mantimentos para a semana',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Criar Tarefa com Linguagem Natural
        </h2>
        
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua tarefa em linguagem natural..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>

        {preview && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Tarefa Criada!</h3>
            <div className="text-sm text-gray-700">
              <p className="font-medium">{preview.title}</p>
              {preview.description && <p className="text-gray-600">{preview.description}</p>}
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {preview.priority}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                  {preview.status}
                </span>
                {preview.due_date && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    {new Date(preview.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Exemplos:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => setInput(example)}
                className="text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-sm text-gray-700 transition-colors"
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
