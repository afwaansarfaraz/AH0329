import { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { SearchBar } from './SearchBar';
import { NavTab } from './Sidebar';

interface HeaderProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedCutoff: string;
  onSelectCutoff: (cutoff: string) => void;
  currentTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onSearch?: (term: string) => void;
}

export function Header({
  selectedDate,
  onSelectDate,
  selectedCutoff,
  onSelectCutoff,
  currentTab = 'overview',
  onSelectTab = () => {},
}: HeaderProps) {
  const [apiStatus, setApiStatus] = useState<'online' | 'checking' | 'offline'>('checking');

  // Check health on mount
  useEffect(() => {
    let isMounted = true;
    api
      .getHealth()
      .then((res) => {
        if (isMounted) {
          setApiStatus(res.artifactLoaded ? 'online' : 'offline');
        }
      })
      .catch(() => {
        if (isMounted) setApiStatus('offline');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Dates in January 2026 evaluation window (Jan 2 to Feb 1)
  const availableDates = [
    ...Array.from({ length: 30 }, (_, i) => `2026-01-${String(i + 2).padStart(2, '0')}`),
    '2026-02-01',
  ];

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--color-surface-elevated)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        zIndex: 40,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Interactive Global SearchBar */}
      <SearchBar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        currentTab={currentTab}
        onSelectTab={onSelectTab}
      />

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Date Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-surface-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
          }}
        >
          <Calendar size={15} style={{ color: 'var(--color-accent-primary)' }} />
          <select
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {availableDates.map((d) => {
              const dt = new Date(`${d}T00:00:00Z`);
              const label = dt.toLocaleDateString('en-GB', {
                timeZone: 'UTC',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              return (
                <option key={d} value={d} style={{ background: '#FFFFFF', color: '#172B4D' }}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Cutoff Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-surface-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
          }}
        >
          <Clock size={15} style={{ color: 'var(--color-warning)' }} />
          <select
            value={selectedCutoff}
            onChange={(e) => onSelectCutoff(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="09:20" style={{ background: '#FFFFFF', color: '#172B4D' }}>
              D-1 09:20 (Prototype)
            </option>
            <option value="06:00" style={{ background: '#FFFFFF', color: '#172B4D' }}>
              D-1 06:00 (Early Run)
            </option>
            <option value="11:00" style={{ background: '#FFFFFF', color: '#172B4D' }}>
              D-1 11:00 (Pre-Auction)
            </option>
            <option value="12:00" style={{ background: '#FFFFFF', color: '#172B4D' }}>
              D-1 12:00 (Midday Run)
            </option>
          </select>
        </div>

        {/* API Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor:
              apiStatus === 'online'
                ? 'rgba(38, 217, 196, 0.1)'
                : apiStatus === 'checking'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${
              apiStatus === 'online'
                ? 'rgba(38, 217, 196, 0.3)'
                : apiStatus === 'checking'
                ? 'rgba(245, 158, 11, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            fontSize: '11px',
            fontWeight: 600,
            color:
              apiStatus === 'online'
                ? 'var(--color-accent-primary)'
                : apiStatus === 'checking'
                ? 'var(--color-warning)'
                : 'var(--color-error)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor:
                apiStatus === 'online'
                  ? 'var(--color-accent-primary)'
                  : apiStatus === 'checking'
                  ? 'var(--color-warning)'
                  : 'var(--color-error)',
              boxShadow:
                apiStatus === 'online'
                  ? '0 0 8px var(--color-accent-primary)'
                  : 'none',
            }}
          />
          <span>{apiStatus === 'online' ? 'API Ready (Jan 2026 Archive)' : apiStatus === 'checking' ? 'Connecting...' : 'API Offline'}</span>
          {apiStatus === 'offline' && (
            <button
              onClick={() => window.location.reload()}
              style={{ color: 'inherit', display: 'flex', alignItems: 'center' }}
              title="Retry API connection"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>

        {/* User Avatar */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-surface-panel)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '11px',
            color: 'var(--color-text-primary)',
            letterSpacing: '0.05em',
          }}
        >
          WD
        </div>
      </div>
    </header>
  );
}
