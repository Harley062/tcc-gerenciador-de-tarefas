import React, { useState, useEffect } from 'react';
import { useTaskStore, Task } from '../store/taskStore';
import TaskCard from './TaskCard';
import AIInsightsPanel from './AIInsightsPanel';
import TaskEditModal from './TaskEditModal';

const ListView: React.FC = () => {
  const { tasks, fetchTasks, updateTask, deleteTask, isLoading } = useTaskStore();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskForAI, setSelectedTaskForAI] = useState<Task | null>(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks({ status: statusFilter || undefined });
  }, [statusFilter, fetchTasks]);

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      await updateTask(taskId, { status });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta tarefa?')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-gradient-primary mb-6">Minhas Tarefas</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 input shadow-sm"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 input shadow-sm min-w-[200px]"
          >
            <option value="">Todos os Status</option>
            <option value="todo">A Fazer</option>
            <option value="in_progress">Em Progresso</option>
            <option value="done">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-warning-700 dark:text-warning-300 uppercase tracking-wide">A Fazer</p>
            <p className="text-2xl font-bold text-warning-800 dark:text-warning-200 mt-1">
              {tasks.filter(t => t.status === 'todo').length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wide">Em Progresso</p>
            <p className="text-2xl font-bold text-primary-800 dark:text-primary-200 mt-1">
              {tasks.filter(t => t.status === 'in_progress').length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border border-success-200 dark:border-success-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-success-700 dark:text-success-300 uppercase tracking-wide">Concluído</p>
            <p className="text-2xl font-bold text-success-800 dark:text-success-200 mt-1">
              {tasks.filter(t => t.status === 'done').length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Cancelado</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">
              {tasks.filter(t => t.status === 'cancelled').length}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400"></div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Carregando tarefas...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 card">
          <svg className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Nenhuma tarefa encontrada</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Tente ajustar os filtros ou adicionar uma nova tarefa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTasks.map((task, index) => (
            <div key={task.id} className="relative animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
              <TaskCard
                task={task}
                onEdit={(task) => setSelectedTaskForEdit(task)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
              <button
                onClick={() => setSelectedTaskForAI(task)}
                className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1"
                title="Ver Insights de IA"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 7H7v6h6V7z" />
                  <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                </svg>
                IA
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedTaskForAI && (
        <AIInsightsPanel
          task={selectedTaskForAI}
          onClose={() => setSelectedTaskForAI(null)}
          onTaskUpdated={() => fetchTasks({})}
        />
      )}

      {selectedTaskForEdit && (
        <TaskEditModal
          task={selectedTaskForEdit}
          onClose={() => setSelectedTaskForEdit(null)}
          onSaved={() => fetchTasks({})}
        />
      )}
    </div>
  );
};

export default ListView;
