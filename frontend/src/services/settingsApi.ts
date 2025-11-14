import axios from 'axios';

export interface UserSettings {
  id: string;
  user_id: string;
  llm_provider: 'gpt4' | 'llama' | 'regex';
  openai_api_key: string | null;
  llama_endpoint: string;
  default_task_duration: number;
  enable_auto_subtasks: boolean;
  enable_auto_priority: boolean;
  enable_auto_tags: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpdateSettingsRequest {
  llm_provider?: 'gpt4' | 'llama' | 'regex';
  openai_api_key?: string;
  llama_endpoint?: string;
  default_task_duration?: number;
  enable_auto_subtasks?: boolean;
  enable_auto_priority?: boolean;
  enable_auto_tags?: boolean;
}

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const response = await axios.get('/api/settings');
    return response.data;
  },

  updateSettings: async (settings: UpdateSettingsRequest): Promise<UserSettings> => {
    const response = await axios.put('/api/settings', settings);
    return response.data;
  },
};
