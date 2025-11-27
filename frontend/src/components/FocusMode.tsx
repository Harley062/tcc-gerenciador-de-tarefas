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

  const focusTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
  const currentTask = focusTasks[currentTaskIndex];

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPomodoroRunning) {
      interval = setInterval(() => {
        if (pomodoroSeconds === 0) {
          if (pomodoroMinutes === 0) {
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
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center animate-fade-in">
        <div className="text-center text-white p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 max-w-lg w-full mx-4">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-200">
            Parabéns!
          </h1>
          <p className="text-xl mb-8 text-gray-300">Todas as tarefas foram concluídas.</p>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/30 font-bold"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-primary-900/20 pointer-events-none"></div>
      
      <div className="relative flex justify-between items-center p-6 border-b border-white/10 bg-gray-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            <span className="text-2xl">🎯</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Modo Foco</h2>
            <p className="text-sm text-gray-400">
              Tarefa {currentTaskIndex + 1} de {focusTasks.length}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          aria-label="Fechar modo foco"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="mb-12 text-center">
          <div className="relative inline-block">
            <div className="text-9xl font-bold font-mono tracking-wider bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 drop-shadow-2xl">
              {String(pomodoroMinutes).padStart(2, '0')}:{String(pomodoroSeconds).padStart(2, '0')}
            </div>
            {isPomodoroRunning && (
              <div className="absolute -right-8 top-0 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
            )}
          </div>
          
          <div className="flex gap-4 justify-center mt-8">
            <button
              onClick={togglePomodoro}
              className={`px-8 py-3 rounded-xl font-bold transition-all transform hover:-translate-y-1 shadow-lg ${
                isPomodoroRunning 
                  ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10' 
                  : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-primary-500/30'
              }`}
            >
              {isPomodoroRunning ? '⏸️ Pausar' : '▶️ Iniciar Foco'}
            </button>
            <button
              onClick={resetPomodoro}
              className="px-6 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-colors font-medium border border-white/5"
            >
              ↺ Resetar
            </button>
          </div>
          <p className="text-primary-300/80 mt-4 font-medium tracking-wide uppercase text-sm">
            {pomodoroMode === 'work' ? '⚡ Tempo de Foco' : '☕ Tempo de Pausa'}
          </p>
        </div>

        <div className="max-w-3xl w-full bg-white/5 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50"></div>
          
          <div className="flex justify-between items-start mb-6">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-lg ${
              currentTask.priority === 'urgent' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
              currentTask.priority === 'high' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
              currentTask.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
              'bg-green-500/20 text-green-300 border border-green-500/30'
            }`}>
              {currentTask.priority === 'urgent' ? '🔴 Urgente' :
               currentTask.priority === 'high' ? '🟠 Alta' :
               currentTask.priority === 'medium' ? '🟡 Média' :
               '🟢 Baixa'}
            </span>
            
            {currentTask.due_date && (
              <div className="text-gray-400 flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg">
                <span>📅</span>
                {new Date(currentTask.due_date).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>

          <h3 className="text-4xl font-bold text-white mb-6 leading-tight">
            {currentTask.title}
          </h3>

          {currentTask.description && (
            <div className="bg-black/20 rounded-xl p-6 mb-8 border border-white/5">
              <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                {currentTask.description}
              </p>
            </div>
          )}

          {currentTask.tags && currentTask.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {currentTask.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-white/5 text-gray-300 rounded-lg text-sm border border-white/5"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-white/10">
            <button
              onClick={handleCompleteTask}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-500 hover:to-green-400 transition-all font-bold shadow-lg shadow-green-500/20 transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
            >
              <span className="text-xl">✓</span> Concluir Tarefa
            </button>
            <button
              onClick={handleNextTask}
              disabled={currentTaskIndex >= focusTasks.length - 1}
              className="px-8 py-4 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20"
            >
              Pular →
            </button>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={handlePreviousTask}
            disabled={currentTaskIndex === 0}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            ← Anterior
          </button>
          <div className="w-px h-6 bg-white/10 self-center"></div>
          <button
            onClick={handleNextTask}
            disabled={currentTaskIndex >= focusTasks.length - 1}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Próxima →
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm text-center">
        <div className="flex justify-center gap-8 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <span className="flex items-center gap-2"><kbd className="bg-white/10 px-2 py-1 rounded text-gray-300">Esc</kbd> Sair</span>
          <span className="flex items-center gap-2"><kbd className="bg-white/10 px-2 py-1 rounded text-gray-300">Space</kbd> Pausar</span>
          <span className="flex items-center gap-2"><kbd className="bg-white/10 px-2 py-1 rounded text-gray-300">Enter</kbd> Concluir</span>
        </div>
      </div>
    </div>
  );
};

export default FocusMode;
