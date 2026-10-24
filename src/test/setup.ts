import '@testing-library/jest-dom';

// Polyfill ResizeObserver for jsdom test environment
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;
