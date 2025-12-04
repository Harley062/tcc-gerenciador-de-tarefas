import React, { useState, useEffect } from 'react';
import { aiApi, TaskSummary } from '../services/aiApi';
import TaskCreateModal from './TaskCreateModal';
import AnalyticsDashboard from './Dashboard/AnalyticsDashboard';
import StatsCard from './Dashboard/StatsCard';
import LoadingSpinner from './LoadingSpinner';
import { useTaskStore } from '../store/taskStore';

const DashboardView: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { fetchTasks } = useTaskStore();

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
      const errorMessage = err?.response?.data?.detail || err?.message || 'Não foi possivel carregar o resumo';
      setError(errorMessage);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/90 dark:bg-red-900/20 backdrop-blur-sm p-4 shadow-lg animate-slide-down">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-sm font-bold text-red-800 dark:text-red-200">Atenção</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}. Exibindo dados em cache ou valores padrão.
                </p>
                <button
                  onClick={loadSummary}
                  className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline transition-colors uppercase tracking-wide"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400">Bem-vindo(a)!</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Aqui está o resumo da sua produtividade.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="flex bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-1.5 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/50">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 capitalize ${
                    period === p
                      ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg shadow-primary-500/30 transform scale-105'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {p === 'daily' ? 'Hoje' : p === 'weekly' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 font-bold shadow-lg hover:shadow-primary-500/40 flex items-center justify-center gap-2 active:scale-95 transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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

        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 shadow-lg border border-white/20 dark:border-gray-700/50 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-colors duration-500"></div>
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20 transform group-hover:rotate-6 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <span className="block">Taxa de Conclusão</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 font-normal">Performance geral</span>
                </div>
              </h2>
              <div className="text-right">
                <div className="text-6xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent font-display">
                  {completionRate.toFixed(0)}%
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Do período selecionado</p>
              </div>
            </div>
            <div className="relative pt-4 z-10">
              <div className="overflow-hidden h-6 mb-4 text-xs flex rounded-full bg-gray-100 dark:bg-gray-700/50 shadow-inner border border-gray-200 dark:border-gray-600">
                <div
                  style={{ width: `${completionRate}%` }}
                  className="shadow-lg shadow-primary-500/30 flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out rounded-full relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm mt-6">
                <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-700/30 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-600">
                  <div className="w-3 h-3 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50"></div>
                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                    <span className="font-bold text-gray-900 dark:text-white text-lg mr-1">{summary?.summary.completed || 0}</span> concluídas
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-700/30 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-600">
                  <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-500"></div>
                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                    Total: <span className="font-bold text-gray-900 dark:text-white text-lg ml-1">{(summary?.summary.completed || 0) + (summary?.summary.in_progress || 0) + (summary?.summary.todo || 0)}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <AnalyticsDashboard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 shadow-lg border border-purple-100 dark:border-purple-900/30 rounded-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <h2 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white relative z-10">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-purple-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <span className="block">Insights de IA</span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Análise inteligente</span>
              </div>
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {summary && summary.insights && summary.insights.length > 0 ? (
                summary.insights.map((insight, index) => (
                  <div key={index} className="bg-white/60 dark:bg-gray-700/40 backdrop-blur-sm rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-purple-100 dark:border-purple-800/30 group hover:bg-white dark:hover:bg-gray-700">
                    <div className="flex gap-3">
                        <span className="text-xl">✨</span>
                        <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-sm font-medium group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">{insight}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                  <p className="font-medium">Nenhum insight disponível no momento.</p>
                  <p className="text-xs mt-2 opacity-70">Continue usando o app para gerar análises.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50 rounded-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <h2 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white relative z-10">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-green-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <span className="block">Tarefas Concluídas</span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Destaques recentes</span>
              </div>
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {summary && summary.top_completed && summary.top_completed.length > 0 ? (
                summary.top_completed.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-700/30 rounded-2xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm hover:shadow-md group">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <span className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{task.title}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ml-2 flex-shrink-0 shadow-sm ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                  <p className="font-medium">Nenhuma tarefa concluída neste período.</p>
                  <button onClick={() => setShowCreateModal(true)} className="text-primary-600 hover:text-primary-700 text-sm font-bold mt-3 hover:underline">
                    Começar uma tarefa
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border border-red-100 dark:border-red-800/30 p-6 shadow-lg rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <h2 className="text-xl font-bold mb-6 flex items-center text-red-800 dark:text-red-200 relative z-10">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-red-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <span className="block">Alta Prioridade</span>
                <span className="text-sm font-normal opacity-80">Tarefas pendentes urgentes</span>
              </div>
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {summary && summary.high_priority_pending && summary.high_priority_pending.length > 0 ? (
                summary.high_priority_pending.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-red-500 group">
                    <span className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">{task.title}</span>
                    {task.due_date && (
                      <span className="text-xs text-red-600 dark:text-red-400 flex items-center ml-2 flex-shrink-0 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">
                        <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {new Date(task.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-dashed border-red-200 dark:border-red-900/30">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 font-bold">Tudo sob controle!</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Nenhuma tarefa urgente pendente.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 border border-blue-100 dark:border-blue-800/30 p-6 shadow-lg rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <h2 className="text-xl font-bold mb-6 flex items-center text-blue-800 dark:text-blue-200 relative z-10">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-blue-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <span className="block">Recomendações</span>
                <span className="text-sm font-normal opacity-80">Dicas personalizadas</span>
              </div>
            </h2>
            <ul className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {summary && summary.recommendations && summary.recommendations.length > 0 ? (
                summary.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start p-4 bg-white/70 dark:bg-gray-800/70 rounded-2xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-700 shadow-sm hover:shadow-md">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3 flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm font-medium">{rec}</span>
                  </li>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-dashed border-blue-200 dark:border-blue-900/30">
                  <p className="font-medium">Sem recomendações no momento.</p>
                </div>
              )}
            </ul>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <TaskCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTasks({});
            loadSummary();
          }}
        />
      )}
    </div>
  );
};

export default DashboardView;
