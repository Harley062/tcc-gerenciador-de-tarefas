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
      set({ 
        error: error.response?.data?.detail || 'Login failed', 
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
      set({ 
        error: error.response?.data?.detail || 'Registration failed', 
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
}));
