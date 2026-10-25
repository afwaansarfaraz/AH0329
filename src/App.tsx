import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { NavTab } from './components/layout/Sidebar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CustomCursor } from './components/common/CustomCursor';
import { DecisionOverviewPage } from './pages/DecisionOverviewPage';
import { VintageComparisonPage } from './pages/VintageComparisonPage';
import { ForecastAccuracyPage } from './pages/ForecastAccuracyPage';
import { ErrorDistributionPage } from './pages/ErrorDistributionPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { MethodologyPage } from './pages/MethodologyPage';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-28');
  const [selectedCutoff, setSelectedCutoff] = useState<string>('09:20');

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <DecisionOverviewPage
            selectedDate={selectedDate}
            selectedCutoff={selectedCutoff}
            onNavigateTab={setCurrentTab}
          />
        );
      case 'vintages':
        return <VintageComparisonPage selectedDate={selectedDate} />;
      case 'accuracy':
        return <ForecastAccuracyPage />;
      case 'distribution':
        return (
          <ErrorDistributionPage
            selectedDate={selectedDate}
            selectedCutoff={selectedCutoff}
          />
        );
      case 'quality':
        return <DataQualityPage />;
      case 'methodology':
        return <MethodologyPage />;
      default:
        return (
          <DecisionOverviewPage
            selectedDate={selectedDate}
            selectedCutoff={selectedCutoff}
            onNavigateTab={setCurrentTab}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <CustomCursor />
      <Layout
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedCutoff={selectedCutoff}
        onSelectCutoff={setSelectedCutoff}
      >
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
