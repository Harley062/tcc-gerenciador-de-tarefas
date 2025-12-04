import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import Login from './components/Login';
import NaturalLanguageInput from './components/NaturalLanguageInput';
import ListView from './components/ListView';
import KanbanView from './components/KanbanView';
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView';
import DashboardView from './components/DashboardView';
// import ChatAssistant from './components/ChatAssistant'; // Desativado temporariamente
import CreateTaskAIModal from './components/CreateTaskAIModal';
import NotificationBell from './components/NotificationBell';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { GlobalStyles } from './styles/GlobalStyles';

type ViewType = 'dashboard' | 'list' | 'kanban' | 'calendar' | 'settings';

const App: React.FC = () => {
  const { isAuthenticated, checkAuth, logout, user } = useAuthStore();
  const { setupWebSocket, fetchTasks } = useTaskStore();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [showInput, setShowInput] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
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
                  SGTI
                </h1>
                <span className="hidden md:block text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wider uppercase">
                  Sistema Gerenciador de Tarefas Inteligente
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowAIModal(true)}
                className="lg:hidden btn btn-primary p-2"
                aria-label="Adicionar nova tarefa"
                title="Adicionar tarefa"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

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
                  aria-selected={currentView === 'kanban'}
                >
                  <span className="text-lg">📋</span>
                  <span className="hidden xl:inline">Kanban</span>
                </button>
                <button
                  onClick={() => setCurrentView('calendar')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'calendar'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Calendário (Atalho: 4)"
                  aria-label="Visualização Calendário"
                  aria-current={currentView === 'calendar' ? 'page' : undefined}
                  role="tab"
                  aria-selected={currentView === 'calendar'}
                >
                  <span className="text-lg">📅</span>
                  <span className="hidden xl:inline">Calendário</span>
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                    currentView === 'settings'
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Configurações (Atalho: 5)"
                  aria-label="Configurações"
                  aria-current={currentView === 'settings' ? 'page' : undefined}
                  role="tab"
                  aria-selected={currentView === 'settings'}
                >
                  <span className="text-lg">⚙️</span>
                  <span className="hidden xl:inline">Ajustes</span>
                </button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                  aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
                  title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
                >
                  {darkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>

                <NotificationBell 
                  onNavigateToList={() => setCurrentView('list')} 
                  onNavigateToTask={(taskId) => {
                    setEditTaskId(taskId);
                    setCurrentView('list');
                  }}
                />

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user?.full_name || user?.email}</p>
                    <button
                      onClick={logout}
                      className="text-xs text-gray-500 hover:text-red-500 transition-colors mt-1"
                    >
                      Sair
                    </button>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20 ring-2 ring-white dark:ring-gray-800">
                    {(user?.full_name || user?.email)?.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>


      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">

        <div className="animate-fade-in">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'list' && (
            <ListView 
              initialEditTaskId={editTaskId} 
              onTaskEdited={() => setEditTaskId(null)} 
            />
          )}
          {currentView === 'kanban' && <KanbanView />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* <ChatAssistant /> */}{/* Desativado temporariamente */}
      {showAIModal && (
        <CreateTaskAIModal
          onClose={() => setShowAIModal(false)}
          onTaskCreated={() => {
            fetchTasks({});
            setShowAIModal(false);
          }}
        />
      )}
      </div>
    </>
  );
};

export default App;
