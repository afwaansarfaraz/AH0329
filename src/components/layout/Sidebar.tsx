import {
  LayoutDashboard,
  Layers,
  BarChart3,
  Activity,
  Database,
  FileText,
  ChevronLeft,
  ChevronRight,
  Wind,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'vintages'
  | 'accuracy'
  | 'distribution'
  | 'quality'
  | 'methodology';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'vintages' as NavTab, label: 'Vintage Comparison', icon: Layers },
    { id: 'accuracy' as NavTab, label: 'Forecast Accuracy', icon: BarChart3 },
    { id: 'distribution' as NavTab, label: 'Error Distribution', icon: Activity },
    { id: 'quality' as NavTab, label: 'Data Quality', icon: Database },
    { id: 'methodology' as NavTab, label: 'Methodology', icon: FileText },
  ];

  return (
    <aside
      style={{
        width: isCollapsed ? '72px' : '240px',
        backgroundColor: 'var(--color-surface-deep)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width var(--transition-normal)',
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {/* Top Branding */}
      <div>
        <div
          style={{
            height: '64px',
            padding: isCollapsed ? '0 16px' : '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent-primary-dim)',
              color: 'var(--color-accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Wind size={22} className="pulse-dot" />
          </div>

          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <h1
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.1,
                }}
              >
                WINDDESK
              </h1>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                }}
              >
                WIND PROCUREMENT INTELLIGENCE
              </span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: isCollapsed ? '10px 0' : '10px 14px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'var(--color-surface-panel)' : 'transparent',
                  color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                  borderLeft: isActive ? '3px solid var(--color-accent-primary)' : '3px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13px',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Mission Card & Version */}
      <div style={{ padding: '16px 12px' }}>
        {!isCollapsed && (
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(180deg, #16263D 0%, #101E31 100%)',
              border: '1px solid var(--color-border)',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                lineHeight: 1.3,
                marginBottom: '4px',
              }}
            >
              Smarter procurement for a cleaner grid.
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                marginBottom: '10px',
              }}
            >
              UK • January 2026 (Historical)
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                color: 'var(--color-accent-primary)',
                background: 'var(--color-accent-primary-dim)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              v1.0.0
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="btn-ghost"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '8px',
          }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
