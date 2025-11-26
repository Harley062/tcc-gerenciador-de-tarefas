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

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationsData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown ao clicar fora
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
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 relative ${
          hasUrgent ? 'animate-pulse' : ''
        }`}
        aria-label="Notificações"
        title="Notificações"
      >
        <svg
          className="w-6 h-6"
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

        {/* Badge with notification count */}
        {totalNotifications > 0 && (
          <span
            className={`absolute -top-1 -right-1 ${
              hasUrgent ? 'bg-danger-500 animate-pulse' : 'bg-primary-500'
            } text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1`}
          >
            {totalNotifications > 99 ? '99+' : totalNotifications}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-slide-down max-h-[32rem] overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notificações
            </h3>
            {totalNotifications > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                hasUrgent
                  ? 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300'
                  : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              }`}>
                {totalNotifications}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400 mb-2"></div>
                <p className="text-sm">Carregando...</p>
              </div>
            ) : totalNotifications === 0 ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">✨</div>
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Tudo em ordem!
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Você não tem tarefas urgentes no momento.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {/* Tarefas Atrasadas */}
                {notifications && notifications.overdue.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-danger-50 dark:bg-danger-900/20 rounded-t-lg border-l-4 border-danger-500">
                      <span className="text-lg">⚠️</span>
                      <h4 className="text-sm font-semibold text-danger-700 dark:text-danger-300 uppercase">
                        {notifications.overdue.length} Atrasada(s)
                      </h4>
                    </div>
                    <div className="space-y-2 mt-2">
                      {notifications.overdue.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 hover:bg-danger-50 dark:hover:bg-danger-900/10 rounded-lg transition-colors"
                        >
                          <div className={`w-1 h-full min-h-[2rem] rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Prazo: {formatDate(task.due_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vence Hoje */}
                {notifications && notifications.due_today.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-warning-50 dark:bg-warning-900/20 rounded-t-lg border-l-4 border-warning-500">
                      <span className="text-lg">📅</span>
                      <h4 className="text-sm font-semibold text-warning-700 dark:text-warning-300 uppercase">
                        Vence Hoje ({notifications.due_today.length})
                      </h4>
                    </div>
                    <div className="space-y-2 mt-2">
                      {notifications.due_today.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 hover:bg-warning-50 dark:hover:bg-warning-900/10 rounded-lg transition-colors"
                        >
                          <div className={`w-1 h-full min-h-[2rem] rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatTime(task.due_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vence Amanhã */}
                {notifications && notifications.due_tomorrow.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-t-lg border-l-4 border-primary-500">
                      <span className="text-lg">🔔</span>
                      <h4 className="text-sm font-semibold text-primary-700 dark:text-primary-300 uppercase">
                        Vence Amanhã ({notifications.due_tomorrow.length})
                      </h4>
                    </div>
                    <div className="space-y-2 mt-2">
                      {notifications.due_tomorrow.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg transition-colors"
                        >
                          <div className={`w-1 h-full min-h-[2rem] rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {task.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alta Prioridade Sem Prazo */}
                {notifications && notifications.high_priority_pending.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-t-lg border-l-4 border-gray-500">
                      <span className="text-lg">🔴</span>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Alta Prioridade ({notifications.high_priority_pending.length})
                      </h4>
                    </div>
                    <div className="space-y-2 mt-2">
                      {notifications.high_priority_pending.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <div className={`w-1 h-full min-h-[2rem] rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {task.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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

          {/* Footer */}
          {totalNotifications > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navegar para visualização de lista (opcional)
                }}
                className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
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
