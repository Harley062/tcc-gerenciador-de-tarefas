import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_URL}/api/auth/refresh`, {
                refresh_token: refreshToken,
              });

              const { access_token, refresh_token } = response.data;
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', refresh_token);

              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async register(email: string, password: string, fullName?: string) {
    const response = await this.api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    return response.data;
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async createTaskNaturalLanguage(naturalLanguageInput: string, projectId?: string) {
    const response = await this.api.post('/tasks', {
      natural_language_input: naturalLanguageInput,
      project_id: projectId,
    });
    return response.data;
  }

  async createTaskStructured(taskData: any) {
    const response = await this.api.post('/tasks', taskData);
    return response.data;
  }

  async getTasks(options?: {
    status?: string;
    projectId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
    q?: string;
  }) {
    const params: any = {};
    if (options?.status) params.status = options.status;
    if (options?.projectId) params.project_id = options.projectId;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;
    if (options?.sortBy) params.sort_by = options.sortBy;
    if (options?.sortOrder) params.sort_order = options.sortOrder;
    if (options?.q) params.q = options.q;
    const response = await this.api.get('/tasks', { params });
    return response.data;
  }

  async getTask(taskId: string) {
    const response = await this.api.get(`/tasks/${taskId}`);
    return response.data;
  }

  async updateTask(taskId: string, updates: any) {
    const response = await this.api.put(`/tasks/${taskId}`, updates);
    return response.data;
  }

  async deleteTask(taskId: string) {
    await this.api.delete(`/tasks/${taskId}`);
  }

  async getSubtasks(taskId: string) {
    const response = await this.api.get(`/tasks/${taskId}/subtasks`);
    return response.data;
  }

  async createSubtask(taskId: string, subtaskData: any) {
    const response = await this.api.post(`/tasks/${taskId}/subtasks`, subtaskData);
    return response.data;
  }
}

export default new ApiService();
