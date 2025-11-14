import React, { useState, useEffect } from 'react';
import { aiApi, TaskSummary } from '../services/aiApi';

const DashboardView: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📊 Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('daily')}
            className={`px-4 py-2 rounded ${period === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-4 py-2 rounded ${period === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 rounded ${period === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Mês
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Concluídas</p>
              <p className="text-3xl font-bold text-green-600">{summary.summary.completed}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Em Progresso</p>
              <p className="text-3xl font-bold text-blue-600">{summary.summary.in_progress}</p>
            </div>
            <div className="text-4xl">🔄</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">A Fazer</p>
              <p className="text-3xl font-bold text-orange-600">{summary.summary.todo}</p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Tempo Total</p>
              <p className="text-3xl font-bold text-purple-600">
                {Math.round(summary.summary.total_time_minutes / 60)}h
              </p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Taxa de Conclusão</h2>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                Progresso
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600">
                {completionRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
            <div
              style={{ width: `${completionRate}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
            ></div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {summary.insights.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">🤖</span>
            Insights de IA
          </h2>
          <div className="space-y-2">
            {summary.insights.map((insight, index) => (
              <div key={index} className="bg-white rounded p-3 shadow-sm">
                <p className="text-gray-800">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Completed Tasks */}
      {summary.top_completed.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🏆 Tarefas Concluídas Recentes</h2>
          <div className="space-y-2">
            {summary.top_completed.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{task.title}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Priority Pending */}
      {summary.high_priority_pending.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-red-800">⚠️ Alta Prioridade Pendente</h2>
          <div className="space-y-2">
            {summary.high_priority_pending.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded">
                <span className="font-medium">{task.title}</span>
                {task.due_date && (
                  <span className="text-sm text-gray-600">
                    📅 {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-800">💡 Recomendações</h2>
          <ul className="space-y-2">
            {summary.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
