import { ReactNode, useState, useEffect } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedCutoff: string;
  onSelectCutoff: (cutoff: string) => void;
  children: ReactNode;
}

export function Layout({
  currentTab,
  onSelectTab,
  selectedDate,
  onSelectDate,
  selectedCutoff,
  onSelectCutoff,
  children,
}: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 850;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 850) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: 'var(--color-canvas)' }}>
      {/* Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Layout Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          selectedCutoff={selectedCutoff}
          onSelectCutoff={onSelectCutoff}
          currentTab={currentTab}
          onSelectTab={onSelectTab}
        />

        <main
          className="main-viewport-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            maxWidth: '1680px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
