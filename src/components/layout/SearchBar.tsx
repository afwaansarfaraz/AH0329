import { useState, useRef, useEffect, useMemo, KeyboardEvent } from 'react';
import {
  Search,
  X,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  BarChart2,
  PieChart,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react';
import { NavTab } from './Sidebar';

export interface SearchBarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

interface PageSearchItem {
  type: 'page';
  id: NavTab;
  title: string;
  description: string;
  badge: string;
  icon: typeof Layers;
  keywords: string[];
}

interface DateSearchItem {
  type: 'date';
  id: string; // ISO YYYY-MM-DD
  title: string;
  description: string;
  badge?: string;
  isCurrent: boolean;
}

type SearchItem = PageSearchItem | DateSearchItem;

// 1. All Supported Dashboard Pages
const DASHBOARD_PAGES: PageSearchItem[] = [
  {
    type: 'page',
    id: 'overview',
    title: 'Decision Overview',
    description: 'Day-ahead forecast vs actual generation, KPI cards, headline metrics',
    badge: 'Core View',
    icon: TrendingUp,
    keywords: ['overview', 'decision', 'forecast', 'actual', 'generation', 'home', 'kpi', 'headline', 'mw', 'bias'],
  },
  {
    type: 'page',
    id: 'vintages',
    title: 'Forecast Vintages',
    description: 'Historical publication runs, revision evolution, lead-time horizon curves',
    badge: 'Revisions',
    icon: Layers,
    keywords: ['vintages', 'revisions', 'runs', 'publication', 'evolution', 'history', 'lead time', 'updates'],
  },
  {
    type: 'page',
    id: 'accuracy',
    title: 'Forecast Accuracy',
    description: 'MAE, RMSE, WAPE degradation segmented across 0-12h to 60-72h lead horizons',
    badge: 'Analytics',
    icon: BarChart2,
    keywords: ['accuracy', 'horizon', 'lead time', 'mae', 'rmse', 'wape', 'error', 'degradation', 'buckets', 'skill'],
  },
  {
    type: 'page',
    id: 'distribution',
    title: 'Error Distribution',
    description: 'Historical signed error percentiles (P5, P50, P95), risk tails and skewness',
    badge: 'Risk Analysis',
    icon: PieChart,
    keywords: ['error distribution', 'distribution', 'percentiles', 'p5', 'p50', 'p95', 'risk', 'tails', 'skew', 'histogram'],
  },
  {
    type: 'page',
    id: 'quality',
    title: 'Data Quality & Audit',
    description: 'BMRS source coverage, settlement periods, paired completeness verification',
    badge: 'Integrity',
    icon: ShieldCheck,
    keywords: ['data quality', 'quality', 'audit', 'completeness', 'elexon', 'bmrs', 'fuelhh', 'windfor', 'missing', '100%'],
  },
];

// 2. All 31 Verified Delivery Dates in January 2026 Archive (Jan 2 - Feb 1, 2026)
const AVAILABLE_DATES: string[] = [
  ...Array.from({ length: 30 }, (_, i) => `2026-01-${String(i + 2).padStart(2, '0')}`),
  '2026-02-01',
];

export function SearchBar({
  selectedDate,
  onSelectDate,
  currentTab,
  onSelectTab,
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global '/' keyboard shortcut to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        // Do not intercept if user is typing inside an input or textarea
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) {
          return;
        }
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Format date helper for labels and comparisons
  const formatDateMetadata = (dateStr: string) => {
    try {
      const dt = new Date(`${dateStr}T00:00:00Z`);
      const day = dt.getUTCDate();
      const monthShort = dt.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'short' });
      const monthLong = dt.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long' });
      const weekday = dt.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long' });
      const formatted = `${String(day).padStart(2, '0')} ${monthShort} 2026`;
      return { day, monthShort, monthLong, weekday, formatted };
    } catch {
      return { day: 0, monthShort: '', monthLong: '', weekday: '', formatted: dateStr };
    }
  };

  // Search Results Filtering & Ranking
  const { matchingPages, matchingDates, flattenedItems } = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    // 1. Default Suggestions (Empty Query)
    if (!cleanQuery) {
      const suggestedPages = DASHBOARD_PAGES;
      // Key highlight dates: Current selected, Jan 28 (default), Jan 15 (mid), Jan 02 (start), Feb 01 (end)
      const keyDateStrings = Array.from(
        new Set([selectedDate, '2026-01-28', '2026-01-15', '2026-01-02', '2026-02-01'])
      );
      const suggestedDates: DateSearchItem[] = keyDateStrings.map((d) => {
        const meta = formatDateMetadata(d);
        let note = `${meta.weekday} • January 2026 Archive`;
        if (d === '2026-01-02') note = 'First delivery day in evaluation period';
        if (d === '2026-01-15') note = 'Mid-month evaluation window';
        if (d === '2026-01-28') note = 'Default case study date';
        if (d === '2026-02-01') note = 'Final evaluated delivery day';

        return {
          type: 'date',
          id: d,
          title: meta.formatted,
          description: note,
          badge: d === selectedDate ? 'Selected' : undefined,
          isCurrent: d === selectedDate,
        };
      });

      return {
        matchingPages: suggestedPages,
        matchingDates: suggestedDates,
        flattenedItems: [...suggestedPages, ...suggestedDates] as SearchItem[],
      };
    }

    // 2. Filter Dashboard Pages
    const pages = DASHBOARD_PAGES.filter((p) => {
      const titleMatch = p.title.toLowerCase().includes(cleanQuery);
      const descMatch = p.description.toLowerCase().includes(cleanQuery);
      const badgeMatch = p.badge.toLowerCase().includes(cleanQuery);
      const keywordMatch = p.keywords.some((k) => k.toLowerCase().includes(cleanQuery));
      return titleMatch || descMatch || badgeMatch || keywordMatch;
    });

    // 3. Filter Valid Historical Dates
    const dates: DateSearchItem[] = [];
    const digitsOnly = cleanQuery.replace(/\D/g, '');

    for (const d of AVAILABLE_DATES) {
      const meta = formatDateMetadata(d);
      let isMatch = false;

      // Exact substring in ISO format: '2026-01-15', '01-15', '2026-01', '02-01'
      if (d.includes(cleanQuery)) {
        isMatch = true;
      }
      // Formatted match: '15 jan', 'jan 15', 'january 15', '15 january', 'feb 1'
      else if (
        meta.formatted.toLowerCase().includes(cleanQuery) ||
        `${meta.day} ${meta.monthLong.toLowerCase()}`.includes(cleanQuery) ||
        `${meta.monthLong.toLowerCase()} ${meta.day}`.includes(cleanQuery)
      ) {
        isMatch = true;
      }
      // Weekday match: 'thursday', 'friday', etc.
      else if (meta.weekday.toLowerCase().includes(cleanQuery)) {
        isMatch = true;
      }
      // Day digits match if query is 1 or 2 digits (e.g. '15', '28', '2')
      else if (digitsOnly && digitsOnly.length <= 2) {
        const queryDay = parseInt(digitsOnly, 10);
        if (queryDay === meta.day && (cleanQuery.includes('feb') ? d.startsWith('2026-02') : true)) {
          isMatch = true;
        }
      }

      if (isMatch) {
        dates.push({
          type: 'date',
          id: d,
          title: meta.formatted,
          description: `${meta.weekday} • Verified 24h Elexon BMRS delivery window`,
          badge: d === selectedDate ? 'Selected' : undefined,
          isCurrent: d === selectedDate,
        });
      }
    }

    return {
      matchingPages: pages,
      matchingDates: dates,
      flattenedItems: [...pages, ...dates.slice(0, 8)] as SearchItem[],
    };
  }, [query, selectedDate]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  // Selection handler
  const handleSelect = (item: SearchItem) => {
    if (item.type === 'page') {
      onSelectTab(item.id);
    } else if (item.type === 'date') {
      onSelectDate(item.id);
    }
    setIsOpen(false);
    setQuery('');
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (flattenedItems.length > 0 ? (prev + 1) % flattenedItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (flattenedItems.length > 0 ? (prev - 1 + flattenedItems.length) % flattenedItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && flattenedItems.length > 0 && flattenedItems[selectedIndex]) {
        handleSelect(flattenedItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '340px', minWidth: '160px' }}>
      {/* Search Bar Input Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: isOpen ? 'var(--color-surface-panel)' : 'var(--color-surface-elevated)',
          border: `1px solid ${isOpen ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
          boxShadow: isOpen ? '0 0 12px rgba(38, 217, 196, 0.2)' : 'none',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 12px',
          transition: 'all 150ms ease',
        }}
      >
        <Search
          size={16}
          style={{
            color: isOpen ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
            flexShrink: 0,
            transition: 'color 150ms ease',
          }}
        />

        <input
          ref={inputRef}
          type="text"
          placeholder="Search pages or dates (e.g. Vintages, 15 Jan)..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            width: '100%',
          }}
        />

        {query ? (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            title="Clear search"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              padding: '2px',
              borderRadius: '2px',
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <kbd
            onClick={() => {
              inputRef.current?.focus();
              setIsOpen(true);
            }}
            style={{
              backgroundColor: 'var(--color-surface-panel)',
              color: 'var(--color-text-muted)',
              fontSize: '11px',
              padding: '2px 5px',
              borderRadius: '3px',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            /
          </kbd>
        )}
      </div>

      {/* Dropdown Results Menu */}
      {isOpen && (
        <div
          ref={listRef}
          className="animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '420px',
            maxHeight: '440px',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 32px rgba(23, 43, 77, 0.12), 0 2px 6px rgba(23, 43, 77, 0.08)',
            zIndex: 100,
            padding: '8px 0',
          }}
        >
          {flattenedItems.length === 0 ? (
            // Empty State
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <AlertCircle size={28} style={{ color: 'var(--color-text-muted)', margin: '0 auto 10px auto' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                No matching results found
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                No dashboard pages or January 2026 delivery dates match &ldquo;{query}&rdquo;.
              </p>
              <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', width: '100%' }}>Suggestions:</span>
                {['Overview', 'Accuracy', 'Vintages', 'Quality', '15 Jan', '28 Jan'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setQuery(chip);
                      inputRef.current?.focus();
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-surface-panel)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-accent-primary)',
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Category: Dashboard Pages */}
              {matchingPages.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div
                    style={{
                      padding: '6px 16px 4px 16px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Layers size={12} style={{ color: 'var(--color-accent-primary)' }} />
                    <span>Dashboard Views ({matchingPages.length})</span>
                  </div>

                  {matchingPages.map((page) => {
                    const index = flattenedItems.indexOf(page);
                    const isSelected = index === selectedIndex;
                    const isCurrent = page.id === currentTab;
                    const IconComponent = page.icon;

                    return (
                      <div
                        key={page.id}
                        data-active={isSelected}
                        onClick={() => handleSelect(page)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(38, 217, 196, 0.08)' : 'transparent',
                          borderLeft: isSelected
                            ? '3px solid var(--color-accent-primary)'
                            : '3px solid transparent',
                          transition: 'background-color 100ms ease',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isCurrent ? 'rgba(38, 217, 196, 0.15)' : 'var(--color-surface-panel)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isCurrent ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                            flexShrink: 0,
                          }}
                        >
                          <IconComponent size={15} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: isSelected || isCurrent ? 700 : 600,
                                color: isCurrent ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                              }}
                            >
                              {page.title}
                            </span>
                            {isCurrent && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-full)',
                                  backgroundColor: 'rgba(38, 217, 196, 0.15)',
                                  color: 'var(--color-accent-primary)',
                                  fontWeight: 600,
                                }}
                              >
                                Active
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: '2px',
                            }}
                          >
                            {page.description}
                          </div>
                        </div>

                        <ArrowRight
                          size={14}
                          style={{
                            color: isSelected ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                            opacity: isSelected ? 1 : 0.4,
                            transform: isSelected ? 'translateX(2px)' : 'none',
                            transition: 'all 150ms ease',
                            flexShrink: 0,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Category: Delivery Dates */}
              {matchingDates.length > 0 && (
                <div>
                  <div
                    style={{
                      padding: '6px 16px 4px 16px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      borderTop: matchingPages.length > 0 ? '1px solid var(--color-border-subtle)' : 'none',
                      marginTop: matchingPages.length > 0 ? '6px' : 0,
                      paddingTop: matchingPages.length > 0 ? '10px' : '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Calendar size={12} style={{ color: 'var(--color-accent-secondary)' }} />
                    <span>January 2026 Delivery Dates ({matchingDates.length})</span>
                  </div>

                  {matchingDates.slice(0, 8).map((dateItem) => {
                    const index = flattenedItems.indexOf(dateItem);
                    const isSelected = index === selectedIndex;
                    const isCurrent = dateItem.isCurrent;

                    return (
                      <div
                        key={dateItem.id}
                        data-active={isSelected}
                        onClick={() => handleSelect(dateItem)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                          borderLeft: isSelected
                            ? '3px solid var(--color-actual)'
                            : '3px solid transparent',
                          transition: 'background-color 100ms ease',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-surface-panel)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isCurrent ? 'var(--color-actual)' : 'var(--color-text-secondary)',
                            flexShrink: 0,
                          }}
                        >
                          <Calendar size={15} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: isSelected || isCurrent ? 700 : 600,
                                color: isCurrent ? 'var(--color-actual)' : 'var(--color-text-primary)',
                              }}
                            >
                              {dateItem.title}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              {dateItem.id}
                            </span>
                            {isCurrent && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-full)',
                                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                  color: 'var(--color-actual)',
                                  fontWeight: 600,
                                }}
                              >
                                Selected
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: '2px',
                            }}
                          >
                            {dateItem.description}
                          </div>
                        </div>

                        {isCurrent ? (
                          <Check size={14} style={{ color: 'var(--color-accent-secondary)', flexShrink: 0 }} />
                        ) : (
                          <ArrowRight
                            size={14}
                            style={{
                              color: isSelected ? 'var(--color-accent-secondary)' : 'var(--color-text-muted)',
                              opacity: isSelected ? 1 : 0.4,
                              transform: isSelected ? 'translateX(2px)' : 'none',
                              transition: 'all 150ms ease',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}

                  {matchingDates.length > 8 && (
                    <div
                      style={{
                        padding: '6px 16px',
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        textAlign: 'center',
                        fontStyle: 'italic',
                      }}
                    >
                      + {matchingDates.length - 8} more historical January dates. Refine query to narrow results.
                    </div>
                  )}
                </div>
              )}

              {/* Footer shortcuts hint */}
              <div
                style={{
                  borderTop: '1px solid var(--color-border-subtle)',
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: 'var(--color-text-muted)',
                  marginTop: '6px',
                }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span><kbd style={{ padding: '1px 4px', background: 'var(--color-surface-panel)', borderRadius: '3px' }}>↑↓</kbd> Navigate</span>
                  <span><kbd style={{ padding: '1px 4px', background: 'var(--color-surface-panel)', borderRadius: '3px' }}>↵</kbd> Select</span>
                  <span><kbd style={{ padding: '1px 4px', background: 'var(--color-surface-panel)', borderRadius: '3px' }}>Esc</kbd> Close</span>
                </div>
                <span>January 2026 Archive</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
