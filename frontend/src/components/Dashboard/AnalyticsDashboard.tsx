import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
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

      // Buscar dados em paralelo
      const [analyticsRes, scoreRes, insightsRes] = await Promise.all([
        fetch('/api/analytics/report?period_days=30'),
        fetch('/api/analytics/productivity-score?period_days=7'),
        fetch('/api/analytics/insights?period_days=30'),
      ]);

      const analyticsData = await analyticsRes.json();
      const scoreData = await scoreRes.json();
      const insightsData = await insightsRes.json();

      setAnalytics(analyticsData);
      setProductivityScore(scoreData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>
          <div className="spinner" />
          <p>Carregando analytics...</p>
        </LoadingSpinner>
      </Container>
    );
  }

  if (!analytics || !productivityScore) {
    return <Container>Erro ao carregar dados</Container>;
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
    <Container className="animate-fade-in" role="region" aria-label="Painel de Analytics">
      <Header>
        <Title>Dashboard de Analytics</Title>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <Subtitle>Visão geral das últimas 4 semanas</Subtitle>
          <button onClick={exportSummaryCSV} aria-label="Exportar resumo CSV" className="px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-sm hover:bg-gray-200 transition">Exportar CSV</button>
        </div>
      </Header>

      {/* Score de Produtividade */}
      <ProductivityScoreSection>
        <ScoreCard>
          <ScoreLabel>Score de Produtividade</ScoreLabel>
          <ScoreCircle score={productivityScore.score}>
            <ScoreValue>{productivityScore.score}</ScoreValue>
            <ScoreMax>/100</ScoreMax>
          </ScoreCircle>
          <ScoreRating score={productivityScore.score}>
            {productivityScore.rating}
          </ScoreRating>
        </ScoreCard>
      </ProductivityScoreSection>

      {/* Cards de Estatísticas */}
      <StatsGrid>
        <StatsCard
          title="Total de Tarefas"
          value={analytics.summary.total_tasks}
          subtitle={`${analytics.summary.active_tasks} ativas`}
          icon="📊"
          color="primary"
        />

        <StatsCard
          title="Taxa de Conclusão"
          value={`${analytics.summary.completion_rate}%`}
          subtitle={`${analytics.summary.completed_tasks} concluídas`}
          icon="✅"
          color="success"
        />

        <StatsCard
          title="Tarefas Atrasadas"
          value={analytics.time_analysis.overdue_count}
          subtitle="Precisam de atenção"
          icon="⚠️"
          color="error"
        />

        <StatsCard
          title="Vence Hoje"
          value={analytics.time_analysis.due_today_count}
          subtitle="Priorize estas"
          icon="📅"
          color="warning"
        />

        <StatsCard
          title="Pontualidade"
          value={`${analytics.completion.on_time_rate}%`}
          subtitle={`${analytics.completion.completed_on_time} no prazo`}
          icon="⏱️"
          color="primary"
        />

        <StatsCard
          title="Tarefas/Dia"
          value={analytics.productivity.avg_tasks_completed_per_day.toFixed(1)}
          subtitle="Média de conclusão"
          icon="🎯"
          color="success"
        />
      </StatsGrid>

      {/* Insights */}
      {insights && insights.insights.length > 0 && (
        <InsightsSection aria-live="polite">
          <SectionTitle>Insights Automáticos</SectionTitle>
          <InsightsList>
            {insights.insights.map((insight, index) => (
              <InsightItem
                key={index}
                className="animate-slide-up"
                style={{ borderLeftColor: getInsightColor(insight) }}
              >
                <InsightIcon aria-hidden>{getInsightIcon(insight)}</InsightIcon>
                <InsightText>{insight}</InsightText>
              </InsightItem>
            ))}
          </InsightsList>
        </InsightsSection>
      )}

      {/* Métricas Detalhadas */}
      <MetricsSection>
        <SectionTitle>Métricas Detalhadas</SectionTitle>
        <MetricsGrid>
          <MetricCard>
            <MetricLabel>Velocidade de Conclusão</MetricLabel>
            <MetricValue>{analytics.productivity.completion_velocity}%</MetricValue>
            <ProgressBar>
              <ProgressFill width={analytics.productivity.completion_velocity} />
            </ProgressBar>
          </MetricCard>

          <MetricCard>
            <MetricLabel>Taxa de Pontualidade</MetricLabel>
            <MetricValue>{analytics.completion.on_time_rate}%</MetricValue>
            <ProgressBar>
              <ProgressFill
                width={analytics.completion.on_time_rate}
                color="#22c55e"
              />
            </ProgressBar>
          </MetricCard>
        </MetricsGrid>
      </MetricsSection>
    </Container>
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

// Styled Components
const Container = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.header`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
`;

const LoadingSpinner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;

  p {
    color: #6b7280;
    font-size: 0.875rem;
  }
`;

const ProductivityScoreSection = styled.section`
  margin-bottom: 2rem;
`;

const ScoreCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
`;

const ScoreLabel = styled.div`
  color: white;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
  opacity: 0.9;
`;

const ScoreCircle = styled.div<{ score: number }>`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    padding: 8px;
    background: conic-gradient(
      #22c55e 0deg ${({ score }) => (score * 3.6)}deg,
      #e5e7eb ${({ score }) => (score * 3.6)}deg 360deg
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }
`;

const ScoreValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
`;

const ScoreMax = styled.div`
  font-size: 1rem;
  color: #6b7280;
`;

const ScoreRating = styled.div<{ score: number }>`
  margin-top: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InsightsSection = styled.section`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
`;

const InsightsList = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const InsightItem = styled.div`
  background: white;
  border-radius: 0.75rem;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border-left: 4px solid #3b82f6;
`;

const InsightIcon = styled.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const InsightText = styled.p`
  margin: 0;
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const MetricsSection = styled.section`
  margin-bottom: 2rem;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.div`
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div`
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #f3f4f6;
  border-radius: 9999px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ width: number; color?: string }>`
  height: 100%;
  width: ${({ width }) => Math.min(width, 100)}%;
  background-color: ${({ color }) => color || '#3b82f6'};
  transition: width 0.3s ease-in-out;
  border-radius: 9999px;
`;
