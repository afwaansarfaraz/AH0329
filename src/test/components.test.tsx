import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../components/common/Card';
import { KpiCard } from '../components/common/KpiCard';
import { DataQualityRing } from '../components/charts/DataQualityRing';
import { Activity } from 'lucide-react';

describe('Frontend UI Components', () => {
  it('renders Card with title and subtitle', () => {
    render(
      <Card title="Test Card" subtitle="Test Subtitle">
        <div>Card Content</div>
      </Card>
    );
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders KpiCard with title, value, unit, and badge', () => {
    render(
      <KpiCard
        title="Forecast MAE"
        value="2,039"
        unit="MW"
        icon={<Activity data-testid="kpi-icon" size={16} />}
        badgeText="Overforecasting"
        badgeVariant="amber"
      />
    );
    expect(screen.getByText('Forecast MAE')).toBeInTheDocument();
    expect(screen.getByText('2,039')).toBeInTheDocument();
    expect(screen.getByText('MW')).toBeInTheDocument();
    expect(screen.getByText('Overforecasting')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
  });

  it('renders DataQualityRing with data completeness gauge', () => {
    render(<DataQualityRing />);
    expect(screen.getByText(/Data completeness/i)).toBeInTheDocument();
    expect(screen.getByText(/Total settlement periods/i)).toBeInTheDocument();
  });
});
