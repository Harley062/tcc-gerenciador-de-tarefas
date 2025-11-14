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
import SubtaskSuggestionsModal from './components/SubtaskSuggestionsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import api from './services/api';

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
  const [showQuickAddSubtaskModal, setShowQuickAddSubtaskModal] = useState(false);
  const [quickAddCreatedTask, setQuickAddCreatedTask] = useState<any>(null);
  const quickAddInputRef = useRef<HTMLInputElement>(null);
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
    { key: 'n', callback: () => quickAddInputRef.current?.focus() },
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <nav className="glass border-b border-gray-200 dark:border-gray-700 shadow-soft sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-display font-bold text-gradient-primary">TaskMaster</h1>

              {/* Persistent Quick-Add Input */}
              <div className="hidden lg:block">
                <div className="relative">
                  <input
                    ref={quickAddInputRef}
                    type="text"
                    placeholder="Adicionar tarefa rápida... (N)"
                    className="w-72 pl-10 pr-4 py-2 text-sm input shadow-sm"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const input = e.currentTarget.value;
                        e.currentTarget.value = '';
                        try {
                          const task = await api.createTaskNaturalLanguage(input);
                          setQuickAddCreatedTask(task);
                          setShowQuickAddSubtaskModal(true);
                          fetchTasks({});
                        } catch (error) {
                          console.error('Failed to create task:', error);
                          fetchTasks({});
                        }
                      }
                    }}
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Quick Add Button */}
              <button
                onClick={() => setShowInput(!showInput)}
                className="lg:hidden btn btn-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {/* View Navigation */}
              <div className="hidden md:flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'dashboard'
                      ? 'gradient-primary text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                  }`}
                  title="Dashboard (1)"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span className="hidden xl:inline">Dashboard</span>
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'list'
                      ? 'gradient-primary text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                  }`}
                  title="Lista (2)"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden xl:inline">Lista</span>
                </button>
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'kanban'
                      ? 'gradient-primary text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                  }`}
                  title="Kanban (3)"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v8a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span className="hidden xl:inline">Kanban</span>
                </button>
                <button
                  onClick={() => setCurrentView('calendar')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'calendar'
                      ? 'gradient-primary text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                  }`}
                  title="Calendário (4)"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden xl:inline">Calendário</span>
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'settings'
                      ? 'gradient-primary text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                  }`}
                  title="Configurações (5)"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden xl:inline">Configurações</span>
                </button>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                title="Alternar modo escuro"
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* User Menu */}
              <div className="flex items-center gap-3 border-l border-gray-300 dark:border-gray-700 pl-3 ml-1">
                <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">{user?.email}</span>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors font-medium text-sm"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-6">
        {showInput && (
          <div className="mb-6">
            <NaturalLanguageInput onTaskCreated={() => fetchTasks({})} />
          </div>
        )}

        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'list' && <ListView />}
        {currentView === 'kanban' && <KanbanView />}
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'settings' && <SettingsView />}
      </main>

      {/* AI Chat Assistant - Always available */}
      <ChatAssistant />

      {/* Quick Add Subtask Suggestions Modal */}
      {showQuickAddSubtaskModal && quickAddCreatedTask && (
        <SubtaskSuggestionsModal
          taskId={quickAddCreatedTask.id}
          taskTitle={quickAddCreatedTask.title}
          taskDescription={quickAddCreatedTask.description}
          onClose={() => {
            setShowQuickAddSubtaskModal(false);
            setQuickAddCreatedTask(null);
            fetchTasks({});
          }}
          onSubtasksCreated={() => {
            setShowQuickAddSubtaskModal(false);
            setQuickAddCreatedTask(null);
            fetchTasks({});
          }}
        />
      )}
    </div>
  );
};

export default App;
