import React, { useState, useEffect } from 'react';
import { aiApi, TaskSummary } from '../services/aiApi';
import TaskCreateModal from './TaskCreateModal';
import AnalyticsDashboard from './Dashboard/AnalyticsDashboard';
import StatsCard from './Dashboard/StatsCard';
import NotificationPanel from './Notifications/NotificationPanel';

const DashboardView: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.generateSummary(period);
      setSummary(data);
    } catch (err) {
      setError('Falha ao carregar resumo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const completionRate = summary.summary.completed + summary.summary.in_progress + summary.summary.todo > 0
    ? (summary.summary.completed / (summary.summary.completed + summary.summary.in_progress + summary.summary.todo)) * 100
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-gradient-primary">
          Dashboard
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium shadow-md flex items-center gap-2"
          >
            <span className="text-xl">➕</span>
            <span>Criar Tarefa</span>
          </button>
          <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-soft">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                period === 'daily'
                  ? 'gradient-primary text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                period === 'weekly'
                  ? 'gradient-primary text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                period === 'monthly'
                  ? 'gradient-primary text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      {/* Notification Panel */}
      <NotificationPanel />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Concluídas" value={summary.summary.completed} subtitle="Tarefas finalizadas" icon={<span style={{fontSize:24}}>✅</span>} color="success" />
        <StatsCard title="Em Progresso" value={summary.summary.in_progress} subtitle="Em andamento" icon={<span style={{fontSize:24}}>🔄</span>} color="primary" />
        <StatsCard title="A Fazer" value={summary.summary.todo} subtitle="Pendentes" icon={<span style={{fontSize:24}}>📝</span>} color="warning" />
        <StatsCard title="Tempo Total" value={`${Math.round(summary.summary.total_time_minutes / 60)}h`} subtitle="Investido" icon={<span style={{fontSize:24}}>⏱️</span>} color="gray" />
      </div>

      {/* Completion Rate */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <h2 className="text-xl font-bold mb-6 dark:text-white">Taxa de Conclusão</h2>
        <div className="relative">
          <div className="flex mb-3 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1.5 px-3 uppercase rounded-full text-primary-700 bg-primary-100 dark:bg-primary-900 dark:text-primary-300">
                Progresso
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {completionRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-4 mb-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              style={{ width: `${completionRate}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center gradient-primary transition-all duration-1000 ease-out rounded-full"
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>{summary.summary.completed} concluídas</span>
            <span>{summary.summary.completed + summary.summary.in_progress + summary.summary.todo} total</span>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {summary.insights.length > 0 && (
        <div className="card bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <h2 className="text-xl font-bold mb-6 flex items-center dark:text-white">
            <span className="text-3xl mr-3">🤖</span>
            <span>Insights de IA</span>
          </h2>
          <div className="space-y-3">
            {summary.insights.map((insight, index) => (
              <div key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-purple-100 dark:border-purple-800">
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Completed Tasks */}
      {summary.top_completed.length > 0 && (
        <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <h2 className="text-xl font-bold mb-6 flex items-center dark:text-white">
            <span className="text-3xl mr-3">🏆</span>
            <span>Tarefas Concluídas Recentes</span>
          </h2>
          <div className="space-y-3">
            {summary.top_completed.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                <span className="font-medium text-gray-900 dark:text-gray-100">{task.title}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  task.priority === 'high' ? 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300' :
                  task.priority === 'medium' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300' :
                  'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300'
                }`}>
                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Priority Pending */}
      {summary.high_priority_pending.length > 0 && (
        <div className="card bg-danger-50 dark:bg-danger-900/20 border-2 border-danger-200 dark:border-danger-800 p-6 animate-bounce-soft" style={{ animationDelay: '0.7s' }}>
          <h2 className="text-xl font-bold mb-6 flex items-center text-danger-800 dark:text-danger-200">
            <span className="text-3xl mr-3">⚠️</span>
            <span>Alta Prioridade Pendente</span>
          </h2>
          <div className="space-y-3">
            {summary.high_priority_pending.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                <span className="font-medium text-gray-900 dark:text-gray-100">{task.title}</span>
                {task.due_date && (
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <div className="card bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 p-6 animate-slide-up" style={{ animationDelay: '0.8s' }}>
          <h2 className="text-xl font-bold mb-6 flex items-center text-primary-800 dark:text-primary-200">
            <span className="text-3xl mr-3">💡</span>
            <span>Recomendações</span>
          </h2>
          <ul className="space-y-3">
            {summary.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <svg className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Task Create Modal */}
      {showCreateModal && (
        <TaskCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadSummary();
          }}
        />
      )}
    </div>
  );
};

export default DashboardView;
