import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

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
    // Atualizar a cada 5 minutos
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
      // Define um estado vazio em caso de erro para não quebrar o componente
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

  if (loading) {
    return (
      <Panel>
        <PanelHeader>
          <Title>Notificações</Title>
        </PanelHeader>
        <LoadingState>
          <div className="spinner" />
          Carregando...
        </LoadingState>
      </Panel>
    );
  }

  if (!notifications || notifications.summary.total_notifications === 0) {
    return (
      <Panel>
        <PanelHeader>
          <Title>Notificações</Title>
          <Badge color="success">0</Badge>
        </PanelHeader>
        <EmptyState>
          <EmptyIcon>✨</EmptyIcon>
          <EmptyText>Tudo em ordem!</EmptyText>
          <EmptySubtext>Você não tem tarefas urgentes no momento.</EmptySubtext>
        </EmptyState>
      </Panel>
    );
  }

  const { summary } = notifications;

  return (
    <Panel className="animate-fade-in">
      <PanelHeader onClick={() => setExpanded(!expanded)}>
        <HeaderLeft>
          <Title>Notificações</Title>
          {summary.has_urgent && <UrgentIndicator>!</UrgentIndicator>}
        </HeaderLeft>
        <HeaderRight>
          <Badge color={summary.has_urgent ? 'error' : 'primary'}>
            {summary.total_notifications}
          </Badge>
          <ToggleIcon expanded={expanded}>▼</ToggleIcon>
        </HeaderRight>
      </PanelHeader>

      {expanded && (
        <PanelContent>
          {/* Tarefas Atrasadas */}
          {notifications.overdue.length > 0 && (
            <NotificationSection>
              <SectionHeader urgent>
                <SectionIcon>⚠️</SectionIcon>
                <SectionTitle>
                  URGENTE: {notifications.overdue.length} Atrasada(s)
                </SectionTitle>
              </SectionHeader>
              <TaskList>
                {notifications.overdue.slice(0, 3).map((task) => (
                  <TaskItem key={task.id} urgent className="animate-slide-up">
                    <TaskPriority priority={task.priority} />
                    <TaskInfo>
                      <TaskTitle>{task.title}</TaskTitle>
                      <TaskMeta>
                        {task.due_date && (
                          <TaskDueDate>
                            Prazo: {formatDate(task.due_date)}
                          </TaskDueDate>
                        )}
                      </TaskMeta>
                    </TaskInfo>
                    <TaskAction href={`/tasks/${task.id}`}>Ver</TaskAction>
                  </TaskItem>
                ))}
              </TaskList>
            </NotificationSection>
          )}

          {/* Vence Hoje */}
          {notifications.due_today.length > 0 && (
            <NotificationSection>
              <SectionHeader>
                <SectionIcon>📅</SectionIcon>
                <SectionTitle>
                  Vence Hoje: {notifications.due_today.length}
                </SectionTitle>
              </SectionHeader>
              <TaskList>
                {notifications.due_today.slice(0, 3).map((task) => (
                  <TaskItem key={task.id} className="animate-slide-up">
                    <TaskPriority priority={task.priority} />
                    <TaskInfo>
                      <TaskTitle>{task.title}</TaskTitle>
                      <TaskMeta>
                        {task.due_date && (
                          <TaskDueDate>
                            {formatTime(task.due_date)}
                          </TaskDueDate>
                        )}
                      </TaskMeta>
                    </TaskInfo>
                    <TaskAction href={`/tasks/${task.id}`}>Ver</TaskAction>
                  </TaskItem>
                ))}
              </TaskList>
            </NotificationSection>
          )}

          {/* Vence Amanhã */}
          {notifications.due_tomorrow.length > 0 && (
            <NotificationSection>
              <SectionHeader>
                <SectionIcon>🔔</SectionIcon>
                <SectionTitle>
                  Vence Amanhã: {notifications.due_tomorrow.length}
                </SectionTitle>
              </SectionHeader>
              <TaskList>
                {notifications.due_tomorrow.slice(0, 2).map((task) => (
                  <TaskItem key={task.id} className="animate-slide-up">
                    <TaskPriority priority={task.priority} />
                    <TaskInfo>
                      <TaskTitle>{task.title}</TaskTitle>
                    </TaskInfo>
                    <TaskAction href={`/tasks/${task.id}`}>Ver</TaskAction>
                  </TaskItem>
                ))}
              </TaskList>
            </NotificationSection>
          )}

          {/* Alta Prioridade Sem Prazo */}
          {notifications.high_priority_pending.length > 0 && (
            <NotificationSection>
              <SectionHeader>
                <SectionIcon>🔴</SectionIcon>
                <SectionTitle>
                  Alta Prioridade: {notifications.high_priority_pending.length}
                </SectionTitle>
              </SectionHeader>
              <TaskList>
                {notifications.high_priority_pending.slice(0, 2).map((task) => (
                  <TaskItem key={task.id} className="animate-slide-up">
                    <TaskPriority priority={task.priority} />
                    <TaskInfo>
                      <TaskTitle>{task.title}</TaskTitle>
                      <TaskMeta>
                        <TaskDueDate>Sem prazo definido</TaskDueDate>
                      </TaskMeta>
                    </TaskInfo>
                    <TaskAction href={`/tasks/${task.id}`}>Ver</TaskAction>
                  </TaskItem>
                ))}
              </TaskList>
            </NotificationSection>
          )}
        </PanelContent>
      )}
    </Panel>
  );
};

// Funções auxiliares
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

// Styled Components
const Panel = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f9fafb;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Title = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const UrgentIndicator = styled.div`
  width: 1.5rem;
  height: 1.5rem;
  background-color: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  animation: pulse 2s infinite;
`;

const Badge = styled.span<{ color: string }>`
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;

  ${({ color }) => {
    switch (color) {
      case 'error':
        return 'background-color: #fee2e2; color: #991b1b;';
      case 'success':
        return 'background-color: #dcfce7; color: #166534;';
      default:
        return 'background-color: #dbeafe; color: #1e40af;';
    }
  }}
`;

const ToggleIcon = styled.span<{ expanded: boolean }>`
  font-size: 0.75rem;
  color: #6b7280;
  transform: ${({ expanded }) => (expanded ? 'rotate(180deg)' : 'rotate(0)')};
  transition: transform 0.2s;
`;

const PanelContent = styled.div`
  padding: 0 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const LoadingState = styled.div`
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
`;

const EmptyState = styled.div`
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const EmptySubtext = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const NotificationSection = styled.div`
  border-radius: 0.5rem;
  overflow: hidden;
`;

const SectionHeader = styled.div<{ urgent?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: ${({ urgent }) => (urgent ? '#fef2f2' : '#f9fafb')};
  border-left: 3px solid ${({ urgent }) => (urgent ? '#ef4444' : '#3b82f6')};
  margin-bottom: 0.75rem;
`;

const SectionIcon = styled.span`
  font-size: 1.125rem;
`;

const SectionTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const TaskItem = styled.div<{ urgent?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: ${({ urgent }) => (urgent ? '#fef2f2' : '#f9fafb')};
  border-radius: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ urgent }) => (urgent ? '#fee2e2' : '#f3f4f6')};
    transform: translateX(4px);
  }
`;

const TaskPriority = styled.div<{ priority: string }>`
  width: 4px;
  height: 2rem;
  border-radius: 9999px;

  ${({ priority }) => {
    const normalizedPriority = priority.toLowerCase();
    if (normalizedPriority === 'urgente' || normalizedPriority === 'urgent') {
      return 'background-color: #ef4444;';
    } else if (normalizedPriority === 'alta' || normalizedPriority === 'high') {
      return 'background-color: #f59e0b;';
    } else if (normalizedPriority === 'media' || normalizedPriority === 'medium') {
      return 'background-color: #3b82f6;';
    } else {
      return 'background-color: #6b7280;';
    }
  }}
`;

const TaskInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TaskTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TaskMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const TaskDueDate = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
`;

const TaskAction = styled.a`
  padding: 0.375rem 0.75rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s;
  flex-shrink: 0;

  &:hover {
    background-color: #2563eb;
  }
`;
