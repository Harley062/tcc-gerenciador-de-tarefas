import React, { useState, useEffect } from 'react';
import { Task } from '../store/taskStore';
import { useTaskStore } from '../store/taskStore';

interface FocusModeProps {
  onClose: () => void;
  initialTask?: Task;
}

const FocusMode: React.FC<FocusModeProps> = ({ onClose, initialTask }) => {
  const { tasks, updateTask } = useTaskStore();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(0);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');

  // Filtrar apenas tarefas não concluídas
  const focusTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
  const currentTask = focusTasks[currentTaskIndex];

  // Timer Pomodoro
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPomodoroRunning) {
      interval = setInterval(() => {
        if (pomodoroSeconds === 0) {
          if (pomodoroMinutes === 0) {
            // Tempo acabou
            setIsPomodoroRunning(false);
            if (pomodoroMode === 'work') {
              setPomodoroMode('break');
              setPomodoroMinutes(5);
            } else {
              setPomodoroMode('work');
              setPomodoroMinutes(25);
            }
            new Audio('/notification.mp3').play().catch(() => {});
          } else {
            setPomodoroMinutes(pomodoroMinutes - 1);
            setPomodoroSeconds(59);
          }
        } else {
          setPomodoroSeconds(pomodoroSeconds - 1);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPomodoroRunning, pomodoroMinutes, pomodoroSeconds, pomodoroMode]);

  const handleCompleteTask = async () => {
    if (currentTask) {
      await updateTask(currentTask.id, { status: 'done' });
      if (currentTaskIndex < focusTasks.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
      }
    }
  };

  const handleNextTask = () => {
    if (currentTaskIndex < focusTasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    }
  };

  const handlePreviousTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
    }
  };

  const togglePomodoro = () => {
    setIsPomodoroRunning(!isPomodoroRunning);
  };

  const resetPomodoro = () => {
    setIsPomodoroRunning(false);
    setPomodoroMinutes(pomodoroMode === 'work' ? 25 : 5);
    setPomodoroSeconds(0);
  };

  if (!currentTask) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Parabéns!</h1>
          <p className="text-xl mb-8">Todas as tarefas foram concluídas.</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 dark:bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Modo Foco</h2>
          <span className="text-gray-400">
            {currentTaskIndex + 1} de {focusTasks.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Fechar modo foco"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Pomodoro Timer */}
        <div className="mb-12 text-center">
          <div className="text-8xl font-bold text-white mb-4 font-mono">
            {String(pomodoroMinutes).padStart(2, '0')}:{String(pomodoroSeconds).padStart(2, '0')}
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={togglePomodoro}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              {isPomodoroRunning ? 'Pausar' : 'Iniciar'}
            </button>
            <button
              onClick={resetPomodoro}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Resetar
            </button>
          </div>
          <p className="text-gray-400 mt-2">
            {pomodoroMode === 'work' ? 'Tempo de Trabalho' : 'Tempo de Pausa'}
          </p>
        </div>

        {/* Current Task */}
        <div className="max-w-3xl w-full bg-gray-800 rounded-lg p-8 shadow-2xl">
          <div className="mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentTask.priority === 'urgent' ? 'bg-red-500 text-white' :
              currentTask.priority === 'high' ? 'bg-orange-500 text-white' :
              currentTask.priority === 'medium' ? 'bg-yellow-500 text-white' :
              'bg-green-500 text-white'
            }`}>
              {currentTask.priority === 'urgent' ? '🔴 Urgente' :
               currentTask.priority === 'high' ? '🟠 Alta' :
               currentTask.priority === 'medium' ? '🟡 Média' :
               '🟢 Baixa'}
            </span>
          </div>

          <h3 className="text-3xl font-bold text-white mb-4">{currentTask.title}</h3>

          {currentTask.description && (
            <p className="text-gray-300 mb-6 text-lg">{currentTask.description}</p>
          )}

          {currentTask.tags && currentTask.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {currentTask.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {currentTask.due_date && (
            <div className="text-gray-400 mb-6">
              Vencimento: {new Date(currentTask.due_date).toLocaleDateString('pt-BR')}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleCompleteTask}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              ✓ Concluir Tarefa
            </button>
            <button
              onClick={handleNextTask}
              disabled={currentTaskIndex >= focusTasks.length - 1}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pular →
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={handlePreviousTask}
            disabled={currentTaskIndex === 0}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <button
            onClick={handleNextTask}
            disabled={currentTaskIndex >= focusTasks.length - 1}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima →
          </button>
        </div>
      </div>

      {/* Footer - Keyboard Shortcuts */}
      <div className="p-4 border-t border-gray-700 text-center text-gray-400 text-sm">
        <span className="mr-4">Esc: Sair</span>
        <span className="mr-4">Space: Pausar/Iniciar</span>
        <span className="mr-4">Enter: Concluir</span>
        <span>→/←: Navegar</span>
      </div>
    </div>
  );
};

export default FocusMode;
