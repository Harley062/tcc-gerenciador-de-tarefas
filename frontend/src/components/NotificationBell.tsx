import React, { useEffect, useState, useRef } from 'react';

interface Task {
  id: string;
  title: string;
  due_date?: string;
  priority: string;
  status: string;
}

interface NotificationsData {
  overdue: Task[];
  due_today: Task[];
  due_tomorrow: Task[];
  due_soon: Task[];
  high_priority_pending: Task[];
  summary: {
    total_notifications: number;
    has_urgent: boolean;
    overdue_count: number;
    due_today_count: number;
  };
  message: string;
}

interface NotificationBellProps {
  onNavigateToList?: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateToList, onNavigateToTask }) => {
  const [notifications, setNotifications] = useState<NotificationsData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/api/analytics/notifications?hours_ahead=24`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setNotifications({
        overdue: [],
        due_today: [],
        due_tomorrow: [],
        due_soon: [],
        high_priority_pending: [],
        summary: {
          total_notifications: 0,
          has_urgent: false,
          overdue_count: 0,
          due_today_count: 0
        },
        message: 'Erro ao carregar notificações'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getPriorityColor = (priority: string): string => {
    const normalizedPriority = priority.toLowerCase();
    if (normalizedPriority === 'urgente' || normalizedPriority === 'urgent') {
      return 'bg-danger-500';
    } else if (normalizedPriority === 'alta' || normalizedPriority === 'high') {
      return 'bg-warning-500';
    } else if (normalizedPriority === 'media' || normalizedPriority === 'medium') {
      return 'bg-primary-500';
    } else {
      return 'bg-gray-400';
    }
  };

  const totalNotifications = notifications?.summary.total_notifications || 0;
  const hasUrgent = notifications?.summary.has_urgent || false;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:shadow-sm transition-all duration-200 relative group ${
          hasUrgent ? 'animate-pulse' : ''
        }`}
        aria-label="Notificações"
        title="Notificações"
      >
        <div className={`absolute inset-0 bg-primary-500/10 dark:bg-primary-400/10 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-200`}></div>
        <svg
          className={`w-6 h-6 transition-transform duration-200 ${isOpen ? 'rotate-12 scale-110' : 'group-hover:rotate-12'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {totalNotifications > 0 && (
          <span
            className={`absolute -top-1 -right-1 ${
              hasUrgent 
                ? 'bg-gradient-to-r from-red-500 to-pink-600 animate-pulse shadow-red-500/50' 
                : 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-primary-500/50'
            } text-white text-[10px] font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1.5 shadow-lg border-2 border-white dark:border-gray-900`}
          >
            {totalNotifications > 99 ? '99+' : totalNotifications}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-96 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 z-50 animate-slide-down max-h-[32rem] overflow-hidden origin-top-right">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl z-10">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Notificações
            </h3>
            {totalNotifications > 0 && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                hasUrgent
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                  : 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800'
              }`}>
                {totalNotifications} novas
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar p-2">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400 mb-2"></div>
                <p className="text-sm font-medium">Atualizando...</p>
              </div>
            ) : totalNotifications === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                  <span className="text-3xl">✨</span>
                </div>
                <p className="text-gray-900 dark:text-gray-100 font-bold mb-1">
                  Tudo em ordem!
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Você não tem tarefas pendentes urgentes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications && notifications.overdue.length > 0 && (
                  <div className="bg-red-50/50 dark:bg-red-900/10 rounded-xl overflow-hidden border border-red-100 dark:border-red-900/30">
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-100/50 dark:bg-red-900/30">
                      <span className="text-lg animate-bounce">⚠️</span>
                      <h4 className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">
                        Atrasadas ({notifications.overdue.length})
                      </h4>
                    </div>
                    <div className="p-2 space-y-1">
                      {notifications.overdue.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateToTask?.(task.id);
                          }}
                          className="group flex items-start gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all shadow-sm hover:shadow-md border border-transparent hover:border-red-100 dark:hover:border-red-900/30 cursor-pointer"
                        >
                          <div className={`w-1.5 h-1.5 mt-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 font-medium">
                                Venceu em {formatDate(task.due_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {notifications && notifications.due_today.length > 0 && (
                  <div className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl overflow-hidden border border-yellow-100 dark:border-yellow-900/30">
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100/50 dark:bg-yellow-900/30">
                      <span className="text-lg">📅</span>
                      <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-300 uppercase tracking-wider">
                        Vence Hoje ({notifications.due_today.length})
                      </h4>
                    </div>
                    <div className="p-2 space-y-1">
                      {notifications.due_today.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateToTask?.(task.id);
                          }}
                          className="group flex items-start gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all shadow-sm hover:shadow-md border border-transparent hover:border-yellow-100 dark:hover:border-yellow-900/30 cursor-pointer"
                        >
                          <div className={`w-1.5 h-1.5 mt-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5 font-medium">
                                Até às {formatTime(task.due_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {notifications && notifications.due_tomorrow.length > 0 && (
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl overflow-hidden border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-100/50 dark:bg-blue-900/30">
                      <span className="text-lg">🔔</span>
                      <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                        Amanhã ({notifications.due_tomorrow.length})
                      </h4>
                    </div>
                    <div className="p-2 space-y-1">
                      {notifications.due_tomorrow.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateToTask?.(task.id);
                          }}
                          className="group flex items-start gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all shadow-sm hover:shadow-md border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 cursor-pointer"
                        >
                          <div className={`w-1.5 h-1.5 mt-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {task.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {notifications && notifications.high_priority_pending.length > 0 && (
                  <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-600">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100/50 dark:bg-gray-700/50">
                      <span className="text-lg">🔴</span>
                      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Alta Prioridade ({notifications.high_priority_pending.length})
                      </h4>
                    </div>
                    <div className="p-2 space-y-1">
                      {notifications.high_priority_pending.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateToTask?.(task.id);
                          }}
                          className="group flex items-start gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all shadow-sm hover:shadow-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer"
                        >
                          <div className={`w-1.5 h-1.5 mt-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {task.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Sem prazo definido
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {totalNotifications > 0 && (
            <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToList?.();
                }}
                className="w-full py-2 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                Ver todas as tarefas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
