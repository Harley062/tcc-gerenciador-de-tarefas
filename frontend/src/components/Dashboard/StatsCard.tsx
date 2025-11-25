import React from 'react';
import styled from 'styled-components';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gray';
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
}) => {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <Title>{title}</Title>
        {icon && <IconWrapper color={color}>{icon}</IconWrapper>}
      </CardHeader>

      <Value>{value}</Value>

      {subtitle && <Subtitle>{subtitle}</Subtitle>}

      {trend && (
        <Trend isPositive={trend.isPositive}>
          <TrendIcon isPositive={trend.isPositive}>
            {trend.isPositive ? '↑' : '↓'}
          </TrendIcon>
          {Math.abs(trend.value)}%
          <TrendText>vs período anterior</TrendText>
        </Trend>
      )}
    </Card>
  );
};

export default StatsCard;

const Card = styled.div`
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  transition: all 0.2s ease-in-out;
  border: 1px solid #f3f4f6;

  &:hover {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const Title = styled.h3`
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const IconWrapper = styled.div<{ color: string }>`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;

  ${({ color }) => {
    switch (color) {
      case 'primary':
        return 'background-color: #dbeafe; color: #2563eb;';
      case 'success':
        return 'background-color: #dcfce7; color: #16a34a;';
      case 'warning':
        return 'background-color: #fef3c7; color: #d97706;';
      case 'error':
        return 'background-color: #fee2e2; color: #dc2626;';
      default:
        return 'background-color: #f3f4f6; color: #4b5563;';
    }
  }}
`;

const Value = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
  line-height: 1;
`;

const Subtitle = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
`;

const Trend = styled.div<{ isPositive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ isPositive }) => (isPositive ? '#16a34a' : '#dc2626')};
`;

const TrendIcon = styled.span<{ isPositive: boolean }>`
  font-size: 1rem;
  font-weight: 700;
`;

const TrendText = styled.span`
  margin-left: 0.25rem;
  color: #9ca3af;
  font-weight: 400;
`;
