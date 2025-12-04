import React, { useState, useEffect, useMemo } from 'react';
import { useTaskStore, Task, isStatusDone, isStatusCancelled, isStatusInProgress, isStatusTodo, isPriorityHigh, isPriorityUrgent, isPriorityMedium, isPriorityLow } from '../store/taskStore';
import TaskCard from './TaskCard';
import AIInsightsPanel from './AIInsightsPanel';
import TaskEditModal from './TaskEditModal';
import ConfirmModal from './ConfirmModal';
import TaskCreateModal from './TaskCreateModal';

type SortOption = 'created_desc' | 'created_asc' | 'priority_desc' | 'priority_asc' | 'due_date_asc' | 'due_date_desc' | 'title_asc' | 'title_desc';
type DueDateFilter = 'all' | 'overdue' | 'today' | 'this_week' | 'this_month' | 'no_date';

interface ListViewProps {
  initialEditTaskId?: string | null;
  onTaskEdited?: () => void;
}

const ListView: React.FC<ListViewProps> = ({ initialEditTaskId, onTaskEdited }) => {
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (initialEditTaskId && tasks.length > 0) {
      const taskToEdit = tasks.find(t => t.id === initialEditTaskId);
      if (taskToEdit) {
        setSelectedTaskForEdit(taskToEdit);
        onTaskEdited?.();
      }
    }
  }, [initialEditTaskId, tasks, onTaskEdited]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, priorityFilter, selectedTags, dueDateFilter, sortBy, statusFilter]);

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

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tasks.forEach(task => {
      task.tags?.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [tasks]);

  const isOverdue = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const isToday = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return today.toDateString() === due.toDateString();
  };

  const isThisWeek = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const due = new Date(dueDate);
    return due >= today && due <= weekFromNow;
  };

  const isThisMonth = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return today.getMonth() === due.getMonth() && today.getFullYear() === due.getFullYear();
  };

  const priorityValue = (priority: string): number => {
    const map: { [key: string]: number } = { urgent: 4, high: 3, medium: 2, low: 1 };
    return map[priority] || 0;
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      const matchesSearch = !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesPriority = true;
      if (priorityFilter === 'urgent') {
        matchesPriority = isPriorityUrgent(task.priority);
      } else if (priorityFilter === 'high') {
        matchesPriority = isPriorityHigh(task.priority);
      } else if (priorityFilter === 'medium') {
        matchesPriority = isPriorityMedium(task.priority);
      } else if (priorityFilter === 'low') {
        matchesPriority = isPriorityLow(task.priority);
      }

      const matchesTags = selectedTags.length === 0 ||
        selectedTags.every(tag => task.tags?.includes(tag));

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

  const overdueCount = useMemo(() =>
    tasks.filter(t => isOverdue(t.due_date) && !isStatusDone(t.status) && !isStatusCancelled(t.status)).length
  , [tasks]);

  const highPriorityCount = useMemo(() =>
    tasks.filter(t => (isPriorityHigh(t.priority) || isPriorityUrgent(t.priority)) &&
      !isStatusDone(t.status) && !isStatusCancelled(t.status)).length
  , [tasks]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('');
    setDueDateFilter('all');
    setSelectedTags([]);
  };

  const hasActiveFilters = searchQuery || priorityFilter || dueDateFilter !== 'all' || selectedTags.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 animate-fade-in space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
            Minhas <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">Tarefas</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
            Gerencie, filtre e organize suas atividades diárias.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="group relative px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-medium shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300 transform hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nova Tarefa</span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{
          label: 'A Fazer',
          count: tasks.filter(t => isStatusTodo(t.status)).length,
          color: 'from-blue-500 to-cyan-400',
          bg: 'bg-blue-50/50 dark:bg-blue-900/10',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-100 dark:border-blue-800/30'
        },
        {
          label: 'Em Progresso',
          count: tasks.filter(t => isStatusInProgress(t.status)).length,
          color: 'from-amber-500 to-orange-400',
          bg: 'bg-amber-50/50 dark:bg-amber-900/10',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-100 dark:border-amber-800/30'
        },
        {
          label: 'Concluído',
          count: tasks.filter(t => isStatusDone(t.status)).length,
          color: 'from-emerald-500 to-green-400',
          bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-100 dark:border-emerald-800/30'
        },
        {
          label: 'Cancelado',
          count: tasks.filter(t => isStatusCancelled(t.status)).length,
          color: 'from-gray-500 to-slate-400',
          bg: 'bg-gray-50/50 dark:bg-gray-800/30',
          text: 'text-gray-700 dark:text-gray-300',
          border: 'border-gray-200 dark:border-gray-700/30'
        }].map((stat, idx) => (
          <div key={idx} className={`relative overflow-hidden rounded-2xl p-6 border ${stat.border} shadow-lg backdrop-blur-xl ${stat.bg} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group`}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:opacity-20 transition-opacity`} />
            <p className={`text-xs font-bold uppercase tracking-wider ${stat.text} mb-2`}>{stat.label}</p>
            <p className={`text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br ${stat.color} font-display`}>
              {stat.count}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50 transition-all duration-300 hover:shadow-xl">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-inner"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap shadow-sm ${
                showFilters || hasActiveFilters
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
              {hasActiveFilters && (
                <span className="ml-2 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                  {[searchQuery ? 1 : 0, priorityFilter ? 1 : 0, dueDateFilter !== 'all' ? 1 : 0, selectedTags.length].reduce((a, b) => a + b, 0)}
                </span>
              )}
            </button>

            <div className="h-12 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden lg:block"></div>

            <div className="relative">
                <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none px-5 py-3 pr-10 bg-gray-100 dark:bg-gray-700 border-none rounded-xl text-gray-700 dark:text-gray-300 font-bold focus:ring-2 focus:ring-primary-500/50 cursor-pointer min-w-[180px] shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                <option value="created_desc">Mais Recentes</option>
                <option value="created_asc">Mais Antigas</option>
                <option value="priority_desc">Maior Prioridade</option>
                <option value="priority_asc">Menor Prioridade</option>
                <option value="due_date_asc">Vencimento (Prox)</option>
                <option value="due_date_desc">Vencimento (Dist)</option>
                <option value="title_asc">A-Z</option>
                <option value="title_desc">Z-A</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 animate-slide-down">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 bg-primary-100 dark:bg-primary-900/30 rounded text-primary-600">🔍</span>
                Refinar Busca
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-500 hover:text-red-600 font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpar tudo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Status</label>
                <div className="relative">
                    <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 appearance-none"
                    >
                    <option value="">Todos</option>
                    <option value="todo">A Fazer</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="done">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Prioridade</label>
                <div className="relative">
                    <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 appearance-none"
                    >
                    <option value="">Todas</option>
                    <option value="urgent">🔴 Urgente</option>
                    <option value="high">🟠 Alta</option>
                    <option value="medium">🟡 Média</option>
                    <option value="low">🟢 Baixa</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Vencimento</label>
                <div className="relative">
                    <select
                    value={dueDateFilter}
                    onChange={(e) => setDueDateFilter(e.target.value as DueDateFilter)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 appearance-none"
                    >
                    <option value="all">Qualquer data</option>
                    <option value="overdue">Atrasadas</option>
                    <option value="today">Hoje</option>
                    <option value="this_week">Esta Semana</option>
                    <option value="this_month">Este Mês</option>
                    <option value="no_date">Sem Data</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="mt-8">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block ml-1">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                        selectedTags.includes(tag)
                          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-700 transform scale-105'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {(overdueCount > 0 || highPriorityCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {overdueCount > 0 && (
            <button
              onClick={() => setDueDateFilter(dueDateFilter === 'overdue' ? 'all' : 'overdue')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                dueDateFilter === 'overdue'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              <span className="flex h-2 w-2 rounded-full bg-current animate-pulse"></span>
              {overdueCount} Atrasada{overdueCount > 1 ? 's' : ''}
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
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                priorityFilter === 'urgent' || priorityFilter === 'high'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30 hover:bg-orange-50 dark:hover:bg-orange-900/20'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
              {highPriorityCount} Alta Prioridade
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-primary-200 dark:border-primary-900 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-primary-600 dark:border-primary-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-500 dark:text-gray-400 font-medium animate-pulse">Carregando suas tarefas...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mb-6">
            <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nenhuma tarefa encontrada</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
            Não encontramos tarefas com os filtros atuais. Tente limpar os filtros ou crie uma nova tarefa para começar.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary-600/20"
          >
            Criar Nova Tarefa
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((task, index) => (
              <div key={task.id} className="relative group animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <TaskCard
                  task={task}
                  onEdit={(task) => setSelectedTaskForEdit(task)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
                <button
                  onClick={() => setSelectedTaskForAI(task)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-sm border border-purple-100 dark:border-purple-900/30"
                  title="Ver Insights de IA"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {filteredTasks.length > itemsPerPage && (
            <div className="flex justify-center items-center gap-4 mt-8 pb-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors text-gray-600 dark:text-gray-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Página {currentPage} de {Math.ceil(filteredTasks.length / itemsPerPage)}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTasks.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredTasks.length / itemsPerPage)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors text-gray-600 dark:text-gray-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
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
