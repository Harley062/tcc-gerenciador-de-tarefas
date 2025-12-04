class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações desktop');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  async notify(title: string, options?: NotificationOptions): Promise<Notification | null> {
    if (!('Notification' in window)) {
      return null;
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options,
      });

      return notification;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }
  }

  notifyOverdueTask(taskTitle: string) {
    return this.notify('Tarefa Atrasada!', {
      body: `A tarefa "${taskTitle}" está atrasada.`,
      tag: 'overdue-task',
      icon: '/logo192.png',
      requireInteraction: false,
    });
  }

  notifyUpcomingTask(taskTitle: string, dueDate: string) {
    return this.notify('Tarefa Próxima do Vencimento', {
      body: `A tarefa "${taskTitle}" vence em ${dueDate}.`,
      tag: 'upcoming-task',
      icon: '/logo192.png',
      requireInteraction: false,
    });
  }

  notifyTaskCompleted(taskTitle: string) {
    return this.notify('Tarefa Concluída!', {
      body: `"${taskTitle}" foi marcada como concluída.`,
      tag: 'task-completed',
      icon: '/logo192.png',
      requireInteraction: false,
    });
  }

  isEnabled(): boolean {
    return 'Notification' in window && this.permission === 'granted';
  }
}

export default new NotificationService();
