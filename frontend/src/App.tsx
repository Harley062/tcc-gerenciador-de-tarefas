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
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

type ViewType = 'dashboard' | 'list' | 'kanban' | 'calendar' | 'settings';

const App: React.FC = () => {
  const { isAuthenticated, checkAuth, logout, user } = useAuthStore();
  const { setupWebSocket, fetchTasks } = useTaskStore();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [showInput, setShowInput] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const listViewSearchRef = useRef<HTMLInputElement>(null);

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-primary-600">TaskMaster</h1>
              
              {/* Persistent Quick-Add Input */}
              <div className="hidden md:block">
                <input
                  ref={quickAddInputRef}
                  type="text"
                  placeholder="Adicionar tarefa rápida... (pressione N)"
                  className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const input = e.currentTarget.value;
                      e.currentTarget.value = '';
                      fetchTasks({});
                      import('./services/api').then(({ default: api }) => {
                        api.createTaskNaturalLanguage(input).then(() => {
                          fetchTasks({});
                        });
                      });
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowInput(!showInput)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors md:hidden"
              >
                {showInput ? 'Ocultar Input' : 'Nova Tarefa'}
              </button>

              <div className="flex gap-2 border-l pl-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentView === 'list'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Lista
                </button>
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentView === 'kanban'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setCurrentView('calendar')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentView === 'calendar'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Calendário
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentView === 'settings'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  ⚙️ Configurações
                </button>
              </div>

              <div className="flex items-center gap-3 border-l pl-4">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  );
};

export default App;
