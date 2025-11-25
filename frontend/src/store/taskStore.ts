import { create } from 'zustand';
import apiService from '../services/api';
import websocketService from '../services/websocket';

export interface Task {
  id: string;
  user_id: string;
  project_id?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_duration?: number;
  actual_duration?: number;
  completed_at?: string;
  tags: string[];
  metadata: any;
  natural_language_input?: string;
  gpt_response?: any;
  created_at?: string;
  updated_at?: string;
}

interface TaskState {
  tasks: Task[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchTasks: (options?: {
    status?: string;
    projectId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
    q?: string;
  }) => Promise<void>;
  createTask: (input: string, projectId?: string) => Promise<Task>;
  createTaskStructured: (taskData: any) => Promise<Task>;
  updateTask: (taskId: string, updates: any) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setupWebSocket: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  total: 0,
  isLoading: false,
  error: null,

  fetchTasks: async (options?: {
    status?: string;
    projectId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
    q?: string;
  }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getTasks({
        ...options,
        limit: options?.limit || 100, // Use higher default limit for now
      });
      set({ tasks: response.tasks, total: response.total, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to fetch tasks', 
        isLoading: false 
      });
    }
  },

  createTask: async (input: string, projectId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const task = await apiService.createTaskNaturalLanguage(input, projectId);
      set((state) => ({ 
        tasks: [...state.tasks, task], 
        isLoading: false 
      }));
      return task;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to create task', 
        isLoading: false 
      });
      throw error;
    }
  },

  createTaskStructured: async (taskData: any) => {
    set({ isLoading: true, error: null });
    try {
      const task = await apiService.createTaskStructured(taskData);
      set((state) => ({ 
        tasks: [...state.tasks, task], 
        isLoading: false 
      }));
      return task;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to create task', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateTask: async (taskId: string, updates: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTask = await apiService.updateTask(taskId, updates);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to update task', 
        isLoading: false 
      });
      throw error;
    }
  },

  deleteTask: async (taskId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.deleteTask(taskId);
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to delete task', 
        isLoading: false 
      });
      throw error;
    }
  },

  setupWebSocket: () => {
    websocketService.on('task_created', (task: Task) => {
      set((state) => ({ tasks: [...state.tasks, task] }));
    });

    websocketService.on('task_updated', (task: Task) => {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
      }));
    });

    websocketService.on('task_deleted', (data: { id: string }) => {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== data.id),
      }));
    });
  },
}));
