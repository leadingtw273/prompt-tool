import '@testing-library/jest-dom';

// jsdom does not provide a full Clipboard API; add a spyable shim for tests.
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async () => undefined },
    writable: true,
    configurable: true,
  });
}
