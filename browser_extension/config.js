// Shared configuration for the browser extension
const CONFIG = {
  DEFAULT_SELECTOR: 'div.mkp-card.mkp-card-debit',
  STORAGE_KEY: 'cardSelector',
  HIGHLIGHT_COLORS: {
    normal: '#ff9800',
    active: '#f44336'
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}

// For content scripts and service workers
if (typeof globalThis !== 'undefined') {
  globalThis.CONFIG = CONFIG;
}
