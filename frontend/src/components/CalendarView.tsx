import React, { useEffect, useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useTaskStore, Task } from '../store/taskStore';
import TaskCard from './TaskCard';
import TaskEditModal from './TaskEditModal';
import TaskCreateModal from './TaskCreateModal';
import ConfirmModal from './ConfirmModal';

const normalizeDate = (dateStr: string | Date) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const CalendarView: React.FC = () => {
  const { tasks, fetchTasks, updateTask, deleteTask, isLoading } = useTaskStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks({});
  }, [fetchTasks]);

  const tasksByDateMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const dateKey = normalizeDate(task.due_date);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(task);
    });
    return map;
  }, [tasks]);

  const tasksForSelectedDate = useMemo(() => {
    return tasksByDateMap[normalizeDate(selectedDate)] || [];
  }, [selectedDate, tasksByDateMap]);

  const stats = useMemo(() => {
    const total = tasksForSelectedDate.length;
    const completed = tasksForSelectedDate.filter(t => t.status === 'done').length;
    return { total, completed, pending: total - completed };
  }, [tasksForSelectedDate]);

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      await updateTask(taskId, { status });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleCreateNewTaskForDate = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setShowConfirm(false);
      setTaskToDelete(null);
    }
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateKey = normalizeDate(date);
      const tasksOnDay = tasksByDateMap[dateKey];

      if (tasksOnDay && tasksOnDay.length > 0) {
        const hasPending = tasksOnDay.some(t => t.status !== 'done');
        return (
          <div className="flex justify-center mt-1 gap-0.5">
            {tasksOnDay.length > 3 ? (
               <span className={`h-1.5 w-1.5 rounded-full ${hasPending ? 'bg-primary-500' : 'bg-emerald-500'}`}></span>
            ) : (
              tasksOnDay.map((_, i) => (
                 <span key={i} className={`h-1.5 w-1.5 rounded-full ${hasPending ? 'bg-primary-500' : 'bg-emerald-500'}`}></span>
              ))
            )}
          </div>
        );
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-primary-200 dark:border-primary-900 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-primary-600 dark:border-primary-400 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium animate-pulse">Sincronizando calendário...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 animate-fade-in space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
            Minha <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">Agenda</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
            Visualize e gerencie seus prazos e entregas.
          </p>
        </div>
      </header>
      
      <div className="flex flex-col gap-8">
        
        <div className="w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-primary-900/5 border border-white/20 dark:border-gray-700/50 p-8">
            <style>{`
              .react-calendar { 
                width: 100%; 
                border: none; 
                font-family: inherit; 
                background: transparent;
              }
              .react-calendar__navigation {
                margin-bottom: 2rem;
                display: flex;
                gap: 0.5rem;
              }
              .react-calendar__navigation button { 
                font-size: 1.1em; 
                font-weight: 700; 
                color: #1f2937;
                min-width: 44px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 12px;
                transition: all 0.2s;
                border: 1px solid rgba(0,0,0,0.05);
              }
              .react-calendar__navigation button:enabled:hover,
              .react-calendar__navigation button:enabled:focus {
                background-color: #f3f4f6;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
              }
              .react-calendar__month-view__weekdays { 
                text-transform: uppercase;
                font-weight: 800;
                font-size: 0.7rem;
                color: #9ca3af;
                text-decoration: none;
                margin-bottom: 1rem;
                letter-spacing: 0.05em;
              }
              .react-calendar__month-view__weekdays__weekday abbr {
                text-decoration: none;
              }
              .react-calendar__tile { 
                padding: 1.2em 0.5em; 
                font-weight: 600;
                border-radius: 16px;
                transition: all 0.2s;
                position: relative;
                font-size: 0.95rem;
              }
              .react-calendar__tile:enabled:hover,
              .react-calendar__tile:enabled:focus {
                background-color: #f3f4f6;
                transform: scale(1.05);
              }
              .react-calendar__tile--active { 
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important; 
                color: white !important; 
                box-shadow: 0 8px 16px rgba(79, 70, 229, 0.3);
                transform: scale(1.05);
              }
              .react-calendar__tile--now { 
                background: #eef2ff; 
                color: #4f46e5; 
                font-weight: 800; 
                border: 1px solid #c7d2fe;
              }
              .react-calendar__month-view__days__day--weekend { 
                color: #ef4444; 
              }

              /* Dark Mode Overrides */
              .dark .react-calendar__navigation button { 
                color: #f3f4f6; 
                background: rgba(255, 255, 255, 0.05);
                border-color: rgba(255, 255, 255, 0.1);
              }
              .dark .react-calendar__navigation button:enabled:hover,
              .dark .react-calendar__navigation button:enabled:focus { background-color: #374151; }
              .dark .react-calendar__tile { color: #e5e7eb; }
              .dark .react-calendar__tile:enabled:hover,
              .dark .react-calendar__tile:enabled:focus { background-color: #374151; }
              .dark .react-calendar__tile--now { background: rgba(30, 58, 138, 0.5); color: #93c5fd; border-color: #1e40af; }
              .dark .react-calendar__month-view__weekdays { color: #6b7280; }
            `}</style>
            <Calendar
              onChange={(value) => setSelectedDate(value as Date)}
              value={selectedDate}
              tileContent={tileContent}
              className="custom-calendar"
              locale="pt-BR"
              next2Label={null}
              prev2Label={null}
            />
          </div>
        </div>

        <div className="w-full space-y-6">
          
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 dark:border-gray-700/50 p-8 flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 rounded-2xl text-primary-600 dark:text-primary-400 shadow-sm">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="capitalize">{selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3 flex gap-6 ml-1">
                <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"></span> 
                  <span className="font-bold text-gray-700 dark:text-gray-300">{stats.total}</span> Tarefas
                </span>
                <span className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full text-emerald-700 dark:text-emerald-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-bold">{stats.completed}</span> Concluídas
                </span>
              </div>
            </div>

            <button
              onClick={handleCreateNewTaskForDate}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-3 transform hover:-translate-y-1 hover:shadow-xl relative z-10"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Tarefa
            </button>
          </div>

          <div className="space-y-4 min-h-[400px]">
            {tasksForSelectedDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 group hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-full shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Dia livre!</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs mb-8 text-lg">
                  Nenhuma tarefa agendada para este dia. Aproveite o tempo livre ou planeje algo novo.
                </p>
                <button
                  onClick={handleCreateNewTaskForDate}
                  className="text-primary-600 dark:text-primary-400 font-bold hover:text-primary-700 dark:hover:text-primary-300 hover:underline text-lg flex items-center gap-2"
                >
                  <span>Criar tarefa para hoje</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </button>
              </div>
            ) : (
              <div className="grid gap-4 transition-all">
                {tasksForSelectedDate.map((task, index) => (
                  <div key={task.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <TaskCard
                      task={task}
                      onEdit={handleEditTask}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditModalOpen && editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTask(null);
          }}
          onSaved={() => {
            fetchTasks({});
            setIsEditModalOpen(false);
            setEditingTask(null);
          }}
        />
      )}

      {isCreateModalOpen && (
        <TaskCreateModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => {
            fetchTasks({});
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {showConfirm && (
        <ConfirmModal
          title="Excluir Tarefa"
          message="Tem certeza que deseja remover esta tarefa permanentemente?"
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};

export default CalendarView;