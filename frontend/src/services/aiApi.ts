import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface SubtaskSuggestion {
  title: string;
  description: string;
  estimated_duration: number;
}

export interface SentimentAnalysis {
  priority: string;
  urgency_score: number;
  sentiment: string;
  confidence: number;
}

export interface DurationEstimate {
  estimated_duration: number;
  confidence: number;
}

export interface SchedulingSuggestion {
  suggestion: string;
  suggested_time: string;
  reason: string;
  confidence: number;
}

export interface Dependency {
  task_id: string;
  task_title: string;
  relationship: string;
  confidence: number;
  reason: string;
}

export interface TaskSummary {
  period: string;
  summary: {
    completed: number;
    in_progress: number;
    todo: number;
    total_time_minutes: number;
  };
  insights: string[];
  top_completed: Array<{ title: string; priority: string }>;
  high_priority_pending: Array<{ title: string; due_date: string | null }>;
  recommendations: string[];
}

export interface ChatMessage {
  message: string;
  action: string | null;
  data: any;
  requires_confirmation?: boolean;
  action_buttons?: Array<{
    label: string;
    action: string;
    data: any;
  }>;
}

export interface ChatActionRequest {
  action: string;
  task_id?: string;
  task_data?: Record<string, any>;
}

export interface ChatActionResponse {
  success: boolean;
  message: string;
  task?: {
    id: string;
    title: string;
    status?: string;
    priority?: string;
    due_date?: string;
  };
}

export interface ParsedTask {
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  estimated_duration: number | null;
  tags: string[];
  cache_hit: boolean;
}

export const aiApi = {
  parseTask: async (text: string): Promise<ParsedTask> => {
    const response = await apiClient.post('/ai/tasks/parse', { text });
    return response.data;
  },
  suggestSubtasks: async (taskTitle: string, taskDescription?: string): Promise<{ subtasks: SubtaskSuggestion[], provider: string }> => {
    const response = await apiClient.post('/ai/subtasks/suggest', {
      task_title: taskTitle,
      task_description: taskDescription,
    });
    return {
      subtasks: response.data.subtasks,
      provider: response.data.provider
    };
  },

  analyzeSentiment: async (text: string): Promise<SentimentAnalysis> => {
    const response = await apiClient.post('/ai/sentiment/analyze', { text });
    return response.data;
  },

  estimateDuration: async (taskTitle: string, taskDescription?: string): Promise<DurationEstimate> => {
    const response = await apiClient.post('/ai/duration/estimate', {
      task_title: taskTitle,
      task_description: taskDescription,
    });
    return response.data;
  },

  suggestScheduling: async (taskId: string): Promise<SchedulingSuggestion> => {
    const response = await apiClient.post('/ai/scheduling/suggest', { task_id: taskId });
    return response.data;
  },

  detectDependencies: async (taskId: string): Promise<Dependency[]> => {
    const response = await apiClient.post('/ai/dependencies/detect', { task_id: taskId });
    return response.data.dependencies;
  },

  generateSummary: async (period: string = 'daily'): Promise<TaskSummary> => {
    const response = await apiClient.post('/ai/summary/generate', { period });
    return response.data;
  },

  sendChatMessage: async (message: string): Promise<ChatMessage> => {
    const response = await apiClient.post('/ai/chat', { message });
    return response.data;
  },

  executeChatAction: async (request: ChatActionRequest): Promise<ChatActionResponse> => {
    const response = await apiClient.post('/ai/chat/action', request);
    return response.data;
  },

  getChatHistory: async (): Promise<any[]> => {
    const response = await apiClient.get('/ai/chat/history');
    return response.data.history;
  },

  clearChatHistory: async (): Promise<void> => {
    await apiClient.delete('/ai/chat/history');
  },
};
