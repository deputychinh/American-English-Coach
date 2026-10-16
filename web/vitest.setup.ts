import '@testing-library/jest-dom/vitest';

// Browser APIs that jsdom lacks and the practice screen touches; tests stub what they need.
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  configurable: true,
  value: { getUserMedia: vi.fn() },
});
