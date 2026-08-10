/// <reference types="vitest" />
import 'fake-indexeddb/auto';

beforeEach(() => {
  // Reset IndexedDB — fake-indexeddb doesn't reset automatically
  // Each test gets a clean state
});

afterEach(() => {
  localStorage.clear();
});
