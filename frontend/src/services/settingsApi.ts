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

export interface UserSettings {
  id: string;
  user_id: string;
  llm_provider: 'gpt4';
  has_openai_api_key: boolean;
  llama_endpoint: string;
  default_task_duration: number;
  enable_auto_subtasks: boolean;
  enable_auto_priority: boolean;
  enable_auto_tags: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpdateSettingsRequest {
  openai_api_key?: string;
  default_task_duration?: number;
  enable_auto_subtasks?: boolean;
  enable_auto_priority?: boolean;
  enable_auto_tags?: boolean;
}

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  updateSettings: async (settings: UpdateSettingsRequest): Promise<UserSettings> => {
    const response = await apiClient.put('/settings', settings);
    return response.data;
  },
};
