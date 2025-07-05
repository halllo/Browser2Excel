// Content script to detect and highlight elements with configurable selector

async function getCurrentSelector() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([CONFIG.STORAGE_KEY], (result) => {
      resolve(result[CONFIG.STORAGE_KEY] || CONFIG.DEFAULT_SELECTOR);
    });
  });
}

async function findCards() {
  // Remove existing highlights first
  const previouslyHighlighted = document.querySelectorAll('[data-card-detector-highlighted="true"]');
  previouslyHighlighted.forEach(card => {
    card.style.outline = '';
    card.removeAttribute('data-card-detector-highlighted');
  });

  const selector = await getCurrentSelector();
  const cards = Array.from(document.querySelectorAll(selector));
  cards.forEach((card, idx) => {
    card.style.outline = `3px solid ${CONFIG.HIGHLIGHT_COLORS.normal}`;
    card.style.outlineOffset = '2px';
    card.setAttribute('data-card-detector-highlighted', 'true');
    card.setAttribute('data-card-detector-id', idx);
  });

  return cards.map((card, idx) => {
    console.info(`Detected element #${idx + 1} with selector: ${selector}`);
    return {
      id: idx,
      content: card.outerHTML,
      element: card,
    };
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_CARDS') {
    findCards().then(cards => {
      sendResponse({ cards: cards.map(c => ({ id: c.id, content: c.content })) });
    });
    return true; // Keep the message channel open for async response
  } else if (request.type === 'HIGHLIGHT_CARD') {
    const card = document.querySelector(`[data-card-detector-id="${request.cardId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.outline = `5px solid ${CONFIG.HIGHLIGHT_COLORS.active}`;
      setTimeout(() => {
        card.style.outline = `3px solid ${CONFIG.HIGHLIGHT_COLORS.normal}`;
      }, 2000);
    }
  }
  return true;
});
