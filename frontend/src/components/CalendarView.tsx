import React, { useEffect, useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useTaskStore, Task } from '../store/taskStore';
import TaskCard from './TaskCard';
import TaskEditModal from './TaskEditModal';
import ConfirmModal from './ConfirmModal';
// Helper para normalizar datas (zerar horas) para comparação correta
const normalizeDate = (dateStr: string | Date) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const CalendarView: React.FC = () => {
  const { tasks, fetchTasks, updateTask, deleteTask, isLoading } = useTaskStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Controle de Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks({});
  }, [fetchTasks]);

  // OTIMIZAÇÃO: Cria um mapa de tarefas por data para não filtrar o array inteiro a cada renderização de dia
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

  // Tarefas da data selecionada
  const tasksForSelectedDate = useMemo(() => {
    return tasksByDateMap[normalizeDate(selectedDate)] || [];
  }, [selectedDate, tasksByDateMap]);

  // Estatísticas rápidas do dia
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
    // Abre o modal já com a data selecionada pré-preenchida
    setEditingTask({ due_date: selectedDate.toISOString() });
    setIsEditModalOpen(true);
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

  // Renderização das bolinhas no calendário
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateKey = normalizeDate(date);
      const tasksOnDay = tasksByDateMap[dateKey];

      if (tasksOnDay && tasksOnDay.length > 0) {
        const hasPending = tasksOnDay.some(t => t.status !== 'done');
        return (
          <div className="flex justify-center mt-1">
            <span className={`h-1.5 w-1.5 rounded-full ${hasPending ? 'bg-primary-600 dark:bg-primary-400' : 'bg-green-500 dark:bg-green-400'}`}></span>
          </div>
        );
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 dark:border-primary-400"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Sincronizando calendário...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agenda</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie suas entregas e prazos.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Coluna Esquerda: Calendário */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-6">
            <style>{`
              .react-calendar { width: 100%; border: none; font-family: inherit; }
              .react-calendar__tile { padding: 1em 0.5em; }
              .react-calendar__tile--active { background: #4f46e5 !important; color: white; border-radius: 8px; }
              .react-calendar__tile--now { background: #eef2ff; color: #4f46e5; border-radius: 8px; font-weight: bold; }
              .react-calendar__tile:hover { background: #f3f4f6; border-radius: 8px; }
              .react-calendar__navigation button { font-size: 1.1em; font-weight: 600; color: #374151; }
              .react-calendar__month-view__days__day--weekend { color: #ef4444; }
              .react-calendar__month-view__weekdays { color: #6b7280; }

              @media (prefers-color-scheme: dark) {
                .react-calendar__navigation button { color: #f3f4f6; }
                .react-calendar__tile { color: #e5e7eb; }
                .react-calendar__tile--now { background: #1e3a8a; color: #93c5fd; }
                .react-calendar__tile:hover { background: #374151; }
                .react-calendar__month-view__weekdays { color: #9ca3af; }
              }

              .dark .react-calendar__navigation button { color: #f3f4f6; }
              .dark .react-calendar__tile { color: #e5e7eb; }
              .dark .react-calendar__tile--now { background: #1e3a8a; color: #93c5fd; }
              .dark .react-calendar__tile:hover { background: #374151; }
              .dark .react-calendar__month-view__weekdays { color: #9ca3af; }
            `}</style>
            <Calendar
              onChange={(value) => setSelectedDate(value as Date)}
              value={selectedDate}
              tileContent={tileContent}
              className="custom-calendar"
              locale="pt-BR"
            />
          </div>
        </div>

        {/* Coluna Direita: Lista de Tarefas */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Cabeçalho da Lista */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <svg className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span> {stats.total} Tarefas
                </span>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {stats.completed} Concluídas
                </span>
              </div>
            </div>

            <button
              onClick={handleCreateNewTaskForDate}
              className="w-full sm:w-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Tarefa
            </button>
          </div>

          {/* Lista de Cards */}
          <div className="space-y-4">
            {tasksForSelectedDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
                  <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Dia livre!</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs mb-6">
                  Nenhuma tarefa agendada para este dia. Aproveite ou planeje algo novo.
                </p>
                <button
                  onClick={handleCreateNewTaskForDate}
                  className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 hover:underline"
                >
                  Criar tarefa para hoje
                </button>
              </div>
            ) : (
              <div className="grid gap-3 transition-all">
                {tasksForSelectedDate.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      {isEditModalOpen && (
        <TaskEditModal
          task={editingTask as Task}
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