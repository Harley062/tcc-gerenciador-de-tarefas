import React, { useEffect, useState } from 'react';

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

const NotificationPanel: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  const getPriorityColor = (priority: string): string => {
    const normalizedPriority = priority.toLowerCase();
    if (normalizedPriority === 'urgente' || normalizedPriority === 'urgent') {
      return 'bg-red-500';
    } else if (normalizedPriority === 'alta' || normalizedPriority === 'high') {
      return 'bg-orange-500';
    } else if (normalizedPriority === 'media' || normalizedPriority === 'medium') {
      return 'bg-blue-500';
    } else {
      return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/50 overflow-hidden">
        <div className="p-5 flex justify-between items-center border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Notificações</h3>
        </div>
        <div className="p-12 flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!notifications || notifications.summary.total_notifications === 0) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/50 overflow-hidden">
        <div className="p-5 flex justify-between items-center border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Notificações</h3>
          <span className="px-2.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">0</span>
        </div>
        <div className="p-12 flex flex-col items-center text-center">
          <div className="text-4xl mb-4 animate-bounce-subtle">✨</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tudo em ordem!</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Você não tem tarefas urgentes no momento.</div>
        </div>
      </div>
    );
  }

  const { summary } = notifications;

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/50 overflow-hidden animate-fade-in transition-all duration-300 hover:shadow-md">
      <div 
        className="p-5 flex justify-between items-center cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Notificações</h3>
          {summary.has_urgent && (
            <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-pulse shadow-lg shadow-red-500/30">
              !
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            summary.has_urgent 
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
              : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
          }`}>
            {summary.total_notifications}
          </span>
          <span className={`text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {expanded && (
        <div className="p-5 flex flex-col gap-6 animate-slide-down">
          {notifications.overdue.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                <span className="text-lg">⚠️</span>
                <h4 className="text-sm font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">
                  URGENTE: {notifications.overdue.length} Atrasada(s)
                </h4>
              </div>
              <div className="flex flex-col gap-2 p-2 bg-red-50/30 dark:bg-red-900/10">
                {notifications.overdue.slice(0, 3).map((task) => (
                  <div key={task.id} className="group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:translate-x-1 border border-transparent hover:border-red-200 dark:hover:border-red-800">
                    <div className={`w-1 h-8 rounded-full ${getPriorityColor(task.priority)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                          <span className="text-xs text-red-500 dark:text-red-400 font-medium">
                            Prazo: {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <a 
                      href={`/tasks/${task.id}`}
                      className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                    >
                      Ver
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notifications.due_today.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-yellow-100 dark:border-yellow-900/30">
              <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500">
                <span className="text-lg">📅</span>
                <h4 className="text-sm font-bold text-yellow-700 dark:text-yellow-300 uppercase tracking-wider">
                  Vence Hoje: {notifications.due_today.length}
                </h4>
              </div>
              <div className="flex flex-col gap-2 p-2 bg-yellow-50/30 dark:bg-yellow-900/10">
                {notifications.due_today.slice(0, 3).map((task) => (
                  <div key={task.id} className="group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:translate-x-1 border border-transparent hover:border-yellow-200 dark:hover:border-yellow-800">
                    <div className={`w-1 h-8 rounded-full ${getPriorityColor(task.priority)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <a 
                      href={`/tasks/${task.id}`}
                      className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                    >
                      Ver
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notifications.due_tomorrow.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500">
                <span className="text-lg">🔔</span>
                <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Vence Amanhã: {notifications.due_tomorrow.length}
                </h4>
              </div>
              <div className="flex flex-col gap-2 p-2 bg-blue-50/30 dark:bg-blue-900/10">
                {notifications.due_tomorrow.slice(0, 2).map((task) => (
                  <div key={task.id} className="group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:translate-x-1 border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                    <div className={`w-1 h-8 rounded-full ${getPriorityColor(task.priority)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.title}</div>
                    </div>
                    <a 
                      href={`/tasks/${task.id}`}
                      className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                    >
                      Ver
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notifications.high_priority_pending.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-l-4 border-gray-500">
                <span className="text-lg">🔴</span>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Alta Prioridade: {notifications.high_priority_pending.length}
                </h4>
              </div>
              <div className="flex flex-col gap-2 p-2 bg-gray-50/30 dark:bg-gray-700/10">
                {notifications.high_priority_pending.slice(0, 2).map((task) => (
                  <div key={task.id} className="group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:translate-x-1 border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                    <div className={`w-1 h-8 rounded-full ${getPriorityColor(task.priority)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Sem prazo definido</span>
                      </div>
                    </div>
                    <a 
                      href={`/tasks/${task.id}`}
                      className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                    >
                      Ver
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default NotificationPanel;
