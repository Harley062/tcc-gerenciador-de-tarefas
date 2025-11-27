import { create } from 'zustand';
import apiService from '../services/api';
import websocketService from '../services/websocket';

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.login(email, password);
      const user = await apiService.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });

      const token = localStorage.getItem('access_token');
      if (token) {
        websocketService.connect(token);
      }
    } catch (error: any) {
      let errorMessage = 'Falha ao fazer login. Tente novamente.';

      if (error.response?.status === 401) {
        errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Dados inválidos. Verifique o formato do email e senha.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Muitas tentativas de login. Aguarde alguns minutos.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message === 'Network Error') {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }

      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  register: async (email: string, password: string, fullName?: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.register(email, password, fullName);
      await apiService.login(email, password);
      const user = await apiService.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });

      const token = localStorage.getItem('access_token');
      if (token) {
        websocketService.connect(token);
      }
    } catch (error: any) {
      let errorMessage = 'Falha ao criar conta. Tente novamente.';

      if (error.response?.status === 400) {
        errorMessage = 'Este email já está cadastrado. Tente fazer login.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Dados inválidos. Verifique o formato do email e senha.';
      } else if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg).join(', ');
        }
      } else if (error.message === 'Network Error') {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }

      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  logout: () => {
    apiService.logout();
    websocketService.disconnect();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const user = await apiService.getCurrentUser();
      set({ user, isAuthenticated: true });
      websocketService.connect(token);
    } catch (error) {
      set({ isAuthenticated: false, user: null });
      apiService.logout();
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
