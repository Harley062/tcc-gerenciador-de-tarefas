import React, { useState, useEffect } from 'react';
import { aiApi, TaskSummary } from '../services/aiApi';
import TaskCreateModal from './TaskCreateModal';
import AnalyticsDashboard from './Dashboard/AnalyticsDashboard';
import StatsCard from './Dashboard/StatsCard';
import LoadingSpinner from './LoadingSpinner';

const DashboardView: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.generateSummary(period);
      if (data && typeof data === 'object') {
        setSummary(data);
        setError(null);
      } else {
        throw new Error('Dados inválidos recebidos da API');
      }
    } catch (err: any) {
      console.error('Erro ao carregar resumo:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Não foi possível carregar o resumo';
      setError(errorMessage);
      // Define um summary vazio como fallback
      setSummary({
        period: period,
        summary: {
          completed: 0,
          in_progress: 0,
          todo: 0,
          total_time_minutes: 0
        },
        insights: [],
        top_completed: [],
        high_priority_pending: [],
        recommendations: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" color="primary" text="Carregando dashboard..." />
      </div>
    );
  }

  const completionRate = summary && summary.summary.completed + summary.summary.in_progress + summary.summary.todo > 0
    ? (summary.summary.completed / (summary.summary.completed + summary.summary.in_progress + summary.summary.todo)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 card border-l-4 border-warning-500 bg-warning-50 dark:bg-warning-900/20 p-4 animate-slide-down">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-warning-800 dark:text-warning-200">Aviso</h3>
                <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
                  {error}. Exibindo dados em cache ou valores padrão.
                </p>
                <button
                  onClick={loadSummary}
                  className="mt-2 text-xs font-medium text-warning-600 dark:text-warning-400 hover:text-warning-800 dark:hover:text-warning-200 underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Visão geral do seu desempenho e produtividade</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nova Tarefa</span>
            </button>
            <div className="flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-md">
              <button
                onClick={() => setPeriod('daily')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                  period === 'daily'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                  period === 'weekly'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                  period === 'monthly'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Mês
              </button>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Concluídas"
            value={summary?.summary.completed || 0}
            subtitle="Tarefas finalizadas"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="success"
          />
          <StatsCard
            title="Em Progresso"
            value={summary?.summary.in_progress || 0}
            subtitle="Em andamento"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="primary"
          />
          <StatsCard
            title="A Fazer"
            value={summary?.summary.todo || 0}
            subtitle="Pendentes"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="warning"
          />
          <StatsCard
            title="Tempo Total"
            value={`${Math.round((summary?.summary.total_time_minutes || 0) / 60)}h`}
            subtitle="Investido"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="gray"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Completion Rate - Takes 2 columns */}
          <div className="lg:col-span-2 card p-6 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span>Taxa de Conclusão</span>
              </h2>
              <div className="text-right">
                <div className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                  {completionRate.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Do período</p>
              </div>
            </div>
            <div className="relative">
              <div className="overflow-hidden h-6 mb-4 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700 shadow-inner">
                <div
                  style={{ width: `${completionRate}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-1000 ease-out rounded-full relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">{summary?.summary.completed || 0}</span> concluídas
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Total: <span className="font-semibold text-gray-900 dark:text-white">{(summary?.summary.completed || 0) + (summary?.summary.in_progress || 0) + (summary?.summary.todo || 0)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl">
            <h3 className="text-xl font-bold mb-4">Ações Rápidas</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-3 text-left transition-all duration-200 flex items-center gap-3 border border-white/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium">Criar Nova Tarefa</span>
              </button>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-sm opacity-90 mb-2">Produtividade</p>
                <p className="text-2xl font-bold">{summary?.summary.completed || 0}/{(summary?.summary.completed || 0) + (summary?.summary.in_progress || 0) + (summary?.summary.todo || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard Section */}
        <div className="mb-8">
          <AnalyticsDashboard />
        </div>

        {/* Bottom Grid - Insights and Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* AI Insights */}
          {summary && summary.insights && summary.insights.length > 0 && (
            <div className="card bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 p-6 shadow-xl border border-purple-200 dark:border-purple-800">
              <h2 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span>Insights de IA</span>
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {summary.insights.map((insight, index) => (
                  <div key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-purple-100 dark:border-purple-700">
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Completed Tasks */}
          {summary && summary.top_completed && summary.top_completed.length > 0 && (
            <div className="card p-6 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <span>Tarefas Concluídas</span>
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {summary.top_completed.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{task.title}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0 ${
                      task.priority === 'high' ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/50 dark:text-danger-300' :
                      task.priority === 'medium' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300' :
                      'bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300'
                    }`}>
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alert Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* High Priority Pending */}
          {summary && summary.high_priority_pending && summary.high_priority_pending.length > 0 && (
            <div className="card bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center text-red-800 dark:text-red-200">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span>Alta Prioridade Pendente</span>
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {summary.high_priority_pending.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{task.title}</span>
                    {task.due_date && (
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center ml-2 flex-shrink-0">
                        <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
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
          {summary && summary.recommendations && summary.recommendations.length > 0 && (
            <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center text-blue-800 dark:text-blue-200">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span>Recomendações</span>
              </h2>
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {summary.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start p-3 bg-white/70 dark:bg-gray-800/70 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors duration-200">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

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
