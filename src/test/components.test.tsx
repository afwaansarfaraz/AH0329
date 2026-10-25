import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../components/common/Card';
import { KpiCard } from '../components/common/KpiCard';
import { DataQualityRing } from '../components/charts/DataQualityRing';
import { Activity } from 'lucide-react';
import { QualityResponse } from '../api/types';

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
        value="2,039 MW"
        icon={<Activity data-testid="kpi-icon" size={16} />}
        badgeText="Overforecasting"
        badgeVariant="amber"
      />
    );
    expect(screen.getByText('Forecast MAE')).toBeInTheDocument();
    expect(screen.getByText('2,039 MW')).toBeInTheDocument();
    expect(screen.getByText('Overforecasting')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
  });

  it('renders DataQualityRing with real quality data', () => {
    const mockQuality: QualityResponse = {
      sourceCoverage: { actualRecordsRaw: 1584, forecastRecordsRaw: 14383 },
      retentionCoverage: { retainedActualHours: 792, retainedForecastCount: 14383 },
      missingIntervals: { missingActualHoursCount: 0, incompleteActualHoursCount: 0, missingActualHours: [] },
      duplicateRecords: { actualDuplicatesEncountered: 0, forecastDuplicatesEncountered: 0 },
      invalidRecords: {},
      evaluationSampleCount: 744,
      warnings: [],
    };

    render(<DataQualityRing quality={mockQuality} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/Completeness/i)).toBeInTheDocument();
    expect(screen.getByText(/Settlement periods recorded/i)).toBeInTheDocument();
    expect(screen.getByText('1,584')).toBeInTheDocument();
  });

  it('renders DataQualityRing skeleton when loading', () => {
    const { container } = render(<DataQualityRing isLoading={true} />);
    expect(container.querySelector('.skeleton')).toBeInTheDocument();
  });
});

