import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// Reset localStorage between tests so persisted Zustand stores start clean
afterEach(() => {
  localStorage.clear()
})

// Stub matchMedia for components that read theme/responsive state
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
