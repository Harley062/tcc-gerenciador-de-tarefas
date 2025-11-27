import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import Login from './components/Login';
import NaturalLanguageInput from './components/NaturalLanguageInput';
import ListView from './components/ListView';
import KanbanView from './components/KanbanView';
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView';
import DashboardView from './components/DashboardView';
import ChatAssistant from './components/ChatAssistant';
import NotificationBell from './components/NotificationBell';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { GlobalStyles } from './styles/GlobalStyles';

type ViewType = 'dashboard' | 'list' | 'kanban' | 'calendar' | 'settings';

const App: React.FC = () => {
  const { isAuthenticated, checkAuth, logout, user } = useAuthStore();
  const { setupWebSocket, fetchTasks } = useTaskStore();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [showInput, setShowInput] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const listViewSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      setupWebSocket();
      fetchTasks({});
    }
  }, [isAuthenticated, setupWebSocket, fetchTasks]);

  useKeyboardShortcuts([
    { key: '1', callback: () => setCurrentView('dashboard') },
    { key: '2', callback: () => setCurrentView('list') },
    { key: '3', callback: () => setCurrentView('kanban') },
    { key: '4', callback: () => setCurrentView('calendar') },
    { key: '5', callback: () => setCurrentView('settings') },
    { key: '/', callback: () => {
      if (currentView === 'list' && listViewSearchRef.current) {
        listViewSearchRef.current.focus();
      }
    }},
    { key: 'Escape', callback: () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }},
  ]);

  if (!isAuthenticated) {
    return <Login onSuccess={() => {}} />;
  }

  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 bg-[url('/grid.svg')] bg-fixed bg-center">
        {/* Skip to main content - Acessibilidade */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] btn btn-primary"
        >
          Pular para o conteúdo principal
        </a>

        <nav
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/50 shadow-lg sticky top-0 z-50 transition-all duration-300"
          role="navigation"
          aria-label="Navegação principal"
        >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-200">
                  TaskMaster
                </h1>
                <span className="hidden md:block text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wider uppercase">
                  Gerenciamento Inteligente
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Quick Add Button */}
              <button
                onClick={() => setShowInput(!showInput)}
                className="lg:hidden btn btn-primary p-2"
                aria-label="Adicionar nova tarefa"
                title="Adicionar tarefa"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {/* View Navigation */}
              <div
                className="hidden md:flex gap-1 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
                role="tablist"
                aria-label="Seleção de visualização"
              >
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'dashboard'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Dashboard (Atalho: 1)"
                  aria-label="Visualização Dashboard"
                  aria-current={currentView === 'dashboard' ? 'page' : undefined}
                  role="tab"
                  aria-selected={currentView === 'dashboard'}
                >
                  <span className="text-lg">📊</span>
                  <span className="hidden xl:inline">Dashboard</span>
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'list'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Lista (Atalho: 2)"
                  aria-label="Visualização em Lista"
                  aria-current={currentView === 'list' ? 'page' : undefined}
                  role="tab"
                  aria-selected={currentView === 'list'}
                >
                  <span className="text-lg">📝</span>
                  <span className="hidden xl:inline">Lista</span>
                </button>
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'kanban'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Kanban (Atalho: 3)"
                  aria-label="Visualização Kanban"
                  aria-current={currentView === 'kanban' ? 'page' : undefined}
                  role="tab"
                  aria-selected={currentView === 'kanban'
