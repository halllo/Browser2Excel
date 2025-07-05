// Content script to detect and highlight mkp-card divs
function findCards() {
  // Remove existing highlights first
  const previouslyHighlighted = document.querySelectorAll('[data-card-detector-highlighted="true"]');
  previouslyHighlighted.forEach(card => {
    card.style.outline = '';
    card.removeAttribute('data-card-detector-highlighted');
  });

  const cards = Array.from(document.querySelectorAll('div.mkp-card.mkp-card-debit'));
  cards.forEach((card, idx) => {
    card.style.outline = '3px solid #ff9800';
    card.style.outlineOffset = '2px';
    card.setAttribute('data-card-detector-highlighted', 'true');
    card.setAttribute('data-card-detector-id', idx);
  });

  return cards.map((card, idx) => {
    console.info(`Detected mkp-card #${idx + 1}`);
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
    const cards = findCards();
    sendResponse({ cards: cards.map(c => ({ id: c.id, content: c.content })) });
  } else if (request.type === 'HIGHLIGHT_CARD') {
    const card = document.querySelector(`[data-card-detector-id="${request.cardId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.outline = '5px solid #f44336';
      setTimeout(() => {
        card.style.outline = '3px solid #ff9800';
      }, 2000);
    }
  }
  return true;
});
