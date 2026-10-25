import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../components/layout/SearchBar';

describe('SearchBar Component', () => {
  it('renders search input and shortcut badge', () => {
    const onSelectDate = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <SearchBar
        selectedDate="2026-01-28"
        onSelectDate={onSelectDate}
        currentTab="overview"
        onSelectTab={onSelectTab}
      />
    );

    const input = screen.getByPlaceholderText(/Search pages or dates/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('opens dropdown on focus and displays initial suggestions', () => {
    const onSelectDate = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <SearchBar
        selectedDate="2026-01-28"
        onSelectDate={onSelectDate}
        currentTab="overview"
        onSelectTab={onSelectTab}
      />
    );

    const input = screen.getByPlaceholderText(/Search pages or dates/i);
    fireEvent.focus(input);

    expect(screen.getByText(/Dashboard Views/i)).toBeInTheDocument();
    expect(screen.getByText('Decision Overview')).toBeInTheDocument();
    expect(screen.getByText('Forecast Vintages')).toBeInTheDocument();
    expect(screen.getByText(/January 2026 Delivery Dates/i)).toBeInTheDocument();
    expect(screen.getByText('28 Jan 2026')).toBeInTheDocument();
  });

  it('filters dashboard pages by title, keyword, or description', () => {
    const onSelectDate = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <SearchBar
        selectedDate="2026-01-28"
        onSelectDate={onSelectDate}
        currentTab="overview"
        onSelectTab={onSelectTab}
      />
    );

    const input = screen.getByPlaceholderText(/Search pages or dates/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'vintage' } });

    expect(screen.getByText('Forecast Vintages')).toBeInTheDocument();
    expect(screen.queryByText('Decision Overview')).not.toBeInTheDocument();
  });

  it('calls onSelectTab when a page result is clicked', () => {
    const onSelectDate = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <SearchBar
        selectedDate="2026-01-28"
        onSelectDate={onSelectDate}
        currentTab="overview"
        onSelectTab={onSelectTab}
      />
    );

    const input = screen.getByPlaceholderText(/Search pages or dates/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'accuracy' } });

    const accuracyOption = screen.getByText('Forecast Accuracy');
    fireEvent.click(accuracyOption);

    expect(onSelectTab).toHaveBeenCalledWith('accuracy');
  });

  it('searches and selects historical delivery dates', () => {
    const onSelectDate = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <SearchBar
        selectedDate="2026-01-28"
        onSelectDate={onSelectDate}
        currentTab="overview"
        onSelectTab={onSelectTab}
      />
    );

    const input = screen.getByPlaceholderText(/Search pages or dates/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '15 Jan' } });

    expect(screen.getByText('15 Jan 2026')).toBeInTheDocument();
    const dateOption = screen.getByText('15 Jan 2026');
    fireEvent.click(dateOption);

    expect(onSelectDate).toHaveBeenCalledWith('2026-01-15');
  });

  it('shows clear empty state when no pages or dates match query', () => {
    const onSelectDate = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <SearchBar
        selectedDate="2026-01-28"
        onSelectDate={onSelectDate}
        currentTab="overview"
        onSelectTab={onSelectTab}
      />
    );

    const input = screen.getByPlaceholderText(/Search pages or dates/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'nonexistentquery123' } });

    expect(screen.getByText(/No matching results found/i)).toBeInTheDocument();
    expect(screen.getByText(/nonexistentquery123/i)).toBeInTheDocument();
  });

  it('supports keyboard navigation with Arrow keys, Enter and Escape', () => {
    const onSelectDate = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <SearchBar
        selectedDate="2026-01-28"
        onSelectDate={onSelectDate}
        currentTab="overview"
        onSelectTab={onSelectTab}
      />
    );

    const input = screen.getByPlaceholderText(/Search pages or dates/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'quality' } });

    // Item 0 is 'Data Quality & Audit'
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectTab).toHaveBeenCalledWith('quality');

    // Test Escape to close
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText(/Dashboard Views/i)).not.toBeInTheDocument();
  });

  it('does not select item on Enter when dropdown is closed', () => {
    const onSelectDate = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <SearchBar
        selectedDate="2026-01-28"
        onSelectDate={onSelectDate}
        currentTab="overview"
        onSelectTab={onSelectTab}
      />
    );

    const input = screen.getByPlaceholderText(/Search pages or dates/i);
    // Open and then close with Escape
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'quality' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // With dropdown closed, pressing Enter should NOT trigger selection
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectTab).not.toHaveBeenCalled();
  });

  it('limits dates in flattenedItems to the first 8 while displaying full matching count and hint', () => {
    const onSelectDate = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <SearchBar
        selectedDate="2026-01-28"
        onSelectDate={onSelectDate}
        currentTab="overview"
        onSelectTab={onSelectTab}
      />
    );

    const input = screen.getByPlaceholderText(/Search pages or dates/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2026-01' } }); // Matches all 30 Jan dates

    // Header should reflect full collection count (30)
    expect(screen.getByText(/January 2026 Delivery Dates \(30\)/i)).toBeInTheDocument();
    // Hint should indicate + 22 more
    expect(screen.getByText(/\+ 22 more historical January dates/i)).toBeInTheDocument();

    // Verify navigating ArrowDown cycles through only the 8 capped dates (since pages is 0 for '2026-01')
    for (let i = 0; i < 7; i++) {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    }
    // 8th date is selected (index 7: 2026-01-09)
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectDate).toHaveBeenCalledWith('2026-01-09');
  });
});
