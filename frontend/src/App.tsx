import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import Login from './components/Login';
import NaturalLanguageInput from './components/NaturalLanguageInput';
import ListView from './components/ListView';
import KanbanView from './components/KanbanView';
import CalendarView from './components/CalendarView';

type ViewType = 'list' | 'kanban' | 'calendar';

const App: React.FC = () => {
  const { isAuthenticated, checkAuth, logout, user } = useAuthStore();
  const { setupWebSocket, fetchTasks } = useTaskStore();
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      setupWebSocket();
      fetchTasks({});
    }
  }, [isAuthenticated, setupWebSocket, fetchTasks]);

  if (!isAuthenticated) {
    return <Login onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">TaskMaster</h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowInput(!showInput)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {showInput ? 'Ocultar Input' : 'Nova Tarefa'}
              </button>

              <div className="flex gap-2 border-l pl-4">
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

        {currentView === 'list' && <ListView />}
        {currentView === 'kanban' && <KanbanView />}
        {currentView === 'calendar' && <CalendarView />}
      </main>
    </div>
  );
};

export default App;
