import React, { useState, useEffect, useMemo } from 'react';
import { useTaskStore, Task } from '../store/taskStore';
import TaskCard from './TaskCard';
import AIInsightsPanel from './AIInsightsPanel';
import TaskEditModal from './TaskEditModal';
import ConfirmModal from './ConfirmModal';
import TaskCreateModal from './TaskCreateModal';

type SortOption = 'created_desc' | 'created_asc' | 'priority_desc' | 'priority_asc' | 'due_date_asc' | 'due_date_desc' | 'title_asc' | 'title_desc';
type DueDateFilter = 'all' | 'overdue' | 'today' | 'this_week' | 'this_month' | 'no_date';

const ListView: React.FC = () => {
  const { tasks, fetchTasks, updateTask, deleteTask, isLoading } = useTaskStore();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTaskForAI, setSelectedTaskForAI] = useState<Task | null>(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const cancelDelete = () => {
    setShowConfirm(false);
    setTaskToDelete(null);
  };

  // Extrair todas as tags únicas das tarefas
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tasks.forEach(task => {
      task.tags?.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [tasks]);

  // Verificar se uma data está atrasada
  const isOverdue = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  // Verificar se uma data é hoje
  const isToday = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return today.toDateString() === due.toDateString();
  };

  // Verificar se uma data está nesta semana
  const isThisWeek = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const due = new Date(dueDate);
    return due >= today && due <= weekFromNow;
  };

  // Verificar se uma data está neste mês
  const isThisMonth = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return today.getMonth() === due.getMonth() && today.getFullYear() === due.getFullYear();
  };

  // Mapear prioridade para valor numérico (para ordenação)
  const priorityValue = (priority: string): number => {
    const map: { [key: string]: number } = { urgent: 4, high: 3, medium: 2, low: 1 };
    return map[priority] || 0;
  };

  // Filtrar e ordenar tarefas
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      // Filtro de busca (título, descrição e tags)
      const matchesSearch = !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Filtro de prioridade
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;

      // Filtro de tags
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.every(tag => task.tags?.includes(tag));

      // Filtro de data de vencimento
      let matchesDueDate = true;
      if (dueDateFilter === 'overdue') {
        matchesDueDate = isOverdue(task.due_date);
      } else if (dueDateFilter === 'today') {
        matchesDueDate = isToday(task.due_date);
      } else if (dueDateFilter === 'this_week') {
        matchesDueDate = isThisWeek(task.due_date);
      } else if (dueDateFilter === 'this_month') {
        matchesDueDate = isThisMonth(task.due_date);
      } else if (dueDateFilter === 'no_date') {
        matchesDueDate = !task.due_date;
      }

      return matchesSearch && matchesPriority && matchesTags && matchesDueDate;
    });

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'created_asc':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
        case 'priority_desc':
          return priorityValue(b.priority) - priorityValue(a.priority);
        case 'priority_asc':
          return priorityValue(a.priority) - priorityValue(b.priority);
        case 'due_date_asc':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'due_date_desc':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, searchQuery, priorityFilter, selectedTags, dueDateFilter, sortBy]);

  // Contador de tarefas atrasadas
  const overdueCount = useMemo(() =>
    tasks.filter(t => isOverdue(t.due_date) && t.status !== 'done' && t.status !== 'cancelled').length
  , [tasks]);

  // Contador de tarefas de alta prioridade
  const highPriorityCount = useMemo(() =>
    tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') &&
      t.status !== 'done' && t.status !== 'cancelled').length
  , [tasks]);

  // Toggle de tag
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Limpar todos os filtros
  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('');
    setDueDateFilter('all');
    setSelectedTags([]);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = searchQuery || priorityFilter || dueDateFilter !== 'all' || selectedTags.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 animate-fade-in">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gradient-primary">Minhas Tarefas</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium shadow-md flex items-center gap-2"
          >
            <span className="text-xl">➕</span>
            <span>Criar Tarefa</span>
          </button>
        </div>

        {/* Barra de busca e controles principais */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por título, descrição ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 input shadow-sm"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="bg-white text-primary-600 text-xs px-2 py-0.5 rounded-full font-bold">
                {[searchQuery ? 1 : 0, priorityFilter ? 1 : 0, dueDateFilter !== 'all' ? 1 : 0, selectedTags.length].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-3 input shadow-sm min-w-[200px]"
          >
            <option value="created_desc">Mais Recentes</option>
            <option value="created_asc">Mais Antigas</option>
            <option value="priority_desc">Maior Prioridade</option>
            <option value="priority_asc">Menor Prioridade</option>
            <option value="due_date_asc">Vencimento: Próximo</option>
            <option value="due_date_desc">Vencimento: Distante</option>
            <option value="title_asc">Título: A-Z</option>
            <option value="title_desc">Título: Z-A</option>
          </select>
        </div>

        {/* Painel de Filtros Avançados */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 animate-slide-down">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Filtros Avançados</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro de Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 input shadow-sm text-sm"
                >
                  <option value="">Todos os Status</option>
                  <option value="todo">A Fazer</option>
                  <option value="in_progress">Em Progresso</option>
                  <option value="done">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* Filtro de Prioridade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prioridade</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 input shadow-sm text-sm"
                >
                  <option value="">Todas as Prioridades</option>
                  <option value="urgent">🔴 Urgente</option>
                  <option value="high">🟠 Alta</option>
                  <option value="medium">🟡 Média</option>
                  <option value="low">🟢 Baixa</option>
                </select>
              </div>

              {/* Filtro de Data de Vencimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vencimento</label>
                <select
                  value={dueDateFilter}
                  onChange={(e) => setDueDateFilter(e.target.value as DueDateFilter)}
                  className="w-full px-3 py-2 input shadow-sm text-sm"
                >
                  <option value="all">Todas as Datas</option>
                  <option value="overdue">⏰ Atrasadas</option>
                  <option value="today">📅 Hoje</option>
                  <option value="this_week">📆 Esta Semana</option>
                  <option value="this_month">🗓️ Este Mês</option>
                  <option value="no_date">➖ Sem Data</option>
                </select>
              </div>
            </div>

            {/* Filtro de Tags */}
            {allTags.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags {selectedTags.length > 0 && `(${selectedTags.length} selecionada${selectedTags.length > 1 ? 's' : ''})`}
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtros Rápidos */}
        <div className="flex flex-wrap gap-2 mb-6">
          {overdueCount > 0 && (
            <button
              onClick={() => setDueDateFilter(dueDateFilter === 'overdue' ? 'all' : 'overdue')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                dueDateFilter === 'overdue'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
              }`}
            >
              <span>⏰</span>
              <span>{overdueCount} Atrasada{overdueCount > 1 ? 's' : ''}</span>
            </button>
          )}
          {highPriorityCount > 0 && (
            <button
              onClick={() => {
                if (priorityFilter === 'urgent' || priorityFilter === 'high') {
                  setPriorityFilter('');
                } else {
                  setPriorityFilter('urgent');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                priorityFilter === 'urgent' || priorityFilter === 'high'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30'
              }`}
            >
              <span>🔥</span>
              <span>{highPriorityCount} Alta Prioridade</span>
            </button>
          )}
          <div className="flex-1"></div>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span className="font-medium">{filteredTasks.length}</span>
            <span>de</span>
            <span className="font-medium">{tasks.length}</span>
            <span>tarefa{tasks.length !== 1 ? 's' : ''}</span>
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
      {showConfirm && (
        <ConfirmModal
          title="Deletar Tarefa"
          message="Tem certeza que deseja deletar esta tarefa?"
          confirmLabel="Deletar"
          cancelLabel="Cancelar"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {/* Task Create Modal */}
      {showCreateModal && (
        <TaskCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTasks({});
          }}
        />
      )}
    </div>
  );
};

export default ListView;
