import React, { useEffect, useState } from 'react';
import StatsCard from './StatsCard';

interface AnalyticsData {
  summary: {
    total_tasks: number;
    active_tasks: number;
    completed_tasks: number;
    completion_rate: number;
  };
  productivity: {
    completion_velocity: number;
    avg_tasks_completed_per_day: number;
  };
  time_analysis: {
    overdue_count: number;
    due_today_count: number;
    due_this_week_count: number;
  };
  completion: {
    on_time_rate: number;
    completed_on_time: number;
    completed_late: number;
  };
}

interface ProductivityScore {
  score: number;
  rating: string;
  completion_rate: number;
  on_time_rate: number;
}

interface Insight {
  insights: string[];
  report_summary: {
    total_tasks: number;
    completion_rate: number;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [productivityScore, setProductivityScore] = useState<ProductivityScore | null>(null);
  const [insights, setInsights] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Simulação de dados para desenvolvimento se a API falhar ou não existir
      // Em produção, remover este bloco try/catch interno ou ajustar conforme necessário
      try {
        const [analyticsRes, scoreRes, insightsRes] = await Promise.all([
            fetch('/api/analytics/report?period_days=30'),
            fetch('/api/analytics/productivity-score?period_days=7'),
            fetch('/api/analytics/insights?period_days=30'),
        ]);

        if (!analyticsRes.ok || !scoreRes.ok || !insightsRes.ok) throw new Error('Falha na API');

        const analyticsData = await analyticsRes.json();
        const scoreData = await scoreRes.json();
        const insightsData = await insightsRes.json();

        setAnalytics(analyticsData);
        setProductivityScore(scoreData);
        setInsights(insightsData);
      } catch (e) {
          console.warn("Usando dados mockados para analytics devido a erro na API", e);
          // Mock data fallback
          setAnalytics({
              summary: { total_tasks: 45, active_tasks: 12, completed_tasks: 33, completion_rate: 73 },
              productivity: { completion_velocity: 85, avg_tasks_completed_per_day: 4.2 },
              time_analysis: { overdue_count: 3, due_today_count: 5, due_this_week_count: 12 },
              completion: { on_time_rate: 92, completed_on_time: 30, completed_late: 3 }
          });
          setProductivityScore({ score: 85, rating: 'Excelente', completion_rate: 73, on_time_rate: 92 });
          setInsights({
              insights: ['Excelente taxa de conclusão esta semana!', 'Você é mais produtivo pela manhã.', '3 tarefas atrasadas precisam de atenção.'],
              report_summary: { total_tasks: 45, completion_rate: 73 }
          });
      }

    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-primary-200 dark:border-primary-900 rounded-full border-t-primary-600 animate-spin"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium animate-pulse">Carregando analytics...</p>
      </div>
    );
  }

  if (!analytics || !productivityScore) {
    return <div className="p-8 text-center text-red-500">Erro ao carregar dados</div>;
  }

  const exportSummaryCSV = () => {
    if (!analytics) return;
    const rows: string[][] = [];
    rows.push(['Métrica', 'Valor']);
    Object.entries(analytics.summary).forEach(([k, v]) => rows.push([k, String(v)]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_summary_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in space-y-8" role="region" aria-label="Painel de Analytics">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Dashboard de Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">Visão geral das últimas 4 semanas</p>
        </div>
        <button 
            onClick={exportSummaryCSV} 
            aria-label="Exportar resumo CSV" 
            className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV
        </button>
      </header>

      {/* Score de Produtividade */}
      <section className="mb-8">
        <div className="bg-gradient-to-br from-primary-600 to-purple-700 rounded-2xl p-8 flex flex-col items-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
          
          <h3 className="text-white/90 font-medium text-lg mb-6 relative z-10">Score de Produtividade</h3>
          
          <div className="relative w-40 h-40 flex items-center justify-center mb-6 z-10">
            {/* Círculo de fundo */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-white/20"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={440}
                strokeDashoffset={440 - (440 * productivityScore.score) / 100}
                className="text-white transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <span className="text-4xl font-bold">{productivityScore.score}</span>
              <span className="text-sm opacity-80">/100</span>
            </div>
          </div>
          
          <div className="text-2xl font-bold text-white relative z-10 bg-white/20 px-6 py-2 rounded-full backdrop-blur-md">
            {productivityScore.rating}
          </div>
        </div>
      </section>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <StatsCard
          title="Total de Tarefas"
          value={analytics.summary.total_tasks}
          subtitle={`${analytics.summary.active_tasks} ativas`}
          icon={<span className="text-xl">📊</span>}
          color="primary"
        />

        <StatsCard
          title="Taxa de Conclusão"
          value={`${analytics.summary.completion_rate}%`}
          subtitle={`${analytics.summary.completed_tasks} concluídas`}
          icon={<span className="text-xl">✅</span>}
          color="success"
        />

        <StatsCard
          title="Tarefas Atrasadas"
          value={analytics.time_analysis.overdue_count}
          subtitle="Precisam de atenção"
          icon={<span className="text-xl">⚠️</span>}
          color="error"
        />

        <StatsCard
          title="Vence Hoje"
          value={analytics.time_analysis.due_today_count}
          subtitle="Priorize estas"
          icon={<span className="text-xl">📅</span>}
          color="warning"
        />

        <StatsCard
          title="Pontualidade"
          value={`${analytics.completion.on_time_rate}%`}
          subtitle={`${analytics.completion.completed_on_time} no prazo`}
          icon={<span className="text-xl">⏱️</span>}
          color="primary"
        />

        <StatsCard
          title="Tarefas/Dia"
          value={analytics.productivity.avg_tasks_completed_per_day.toFixed(1)}
          subtitle="Média de conclusão"
          icon={<span className="text-xl">🎯</span>}
          color="success"
        />
      </div>

      {/* Insights */}
      {insights && insights.insights.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">💡</span>
            Insights Automáticos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.insights.map((insight, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4 border-primary-500 flex items-start gap-4 animate-slide-up hover:shadow-md transition-all"
                style={{ 
                    animationDelay: `${index * 0.1}s`,
                    borderLeftColor: getInsightColor(insight)
                }}
              >
                <div className="text-2xl flex-shrink-0" aria-hidden>{getInsightIcon(insight)}</div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed font-medium pt-1">{insight}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Métricas Detalhadas */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Métricas Detalhadas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Velocidade de Conclusão</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.productivity.completion_velocity}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(analytics.productivity.completion_velocity, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Taxa de Pontualidade</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.completion.on_time_rate}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-green-500 h-2.5 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(analytics.completion.on_time_rate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Função auxiliar para determinar o ícone do insight
const getInsightIcon = (insight: string): string => {
  if (insight.includes('Excelente') || insight.includes('Parabéns')) return '🎉';
  if (insight.includes('ATENÇÃO') || insight.includes('atrasadas')) return '⚠️';
  if (insight.includes('Ótima') || insight.includes('Boa')) return '✨';
  if (insight.includes('baixa') || insight.includes('Precisa')) return '📉';
  return '💡';
};

const getInsightColor = (insight: string): string => {
  if (insight.includes('Excelente') || insight.includes('Parabéns')) return '#10b981'; // green
  if (insight.includes('ATENÇÃO') || insight.includes('atrasadas')) return '#ef4444'; // red
  if (insight.includes('Ótima') || insight.includes('Boa')) return '#f59e0b'; // amber
  if (insight.includes('baixa') || insight.includes('Precisa')) return '#f97316'; // orange
  return '#3b82f6'; // blue default
};

export default AnalyticsDashboard;
