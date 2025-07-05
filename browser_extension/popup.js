// Popup script to display detected cards
function renderCards(cards) {
  const container = document.getElementById('cards');
  container.innerHTML = '';
  
  if (!cards || cards.length === 0) {
    container.innerHTML = '<div class="no-cards">No mkp-card divs found on this page.</div>';
    return;
  }

  cards.forEach((card, index) => {
    const card_content = card.content.replace(/\s{2,}|\n/g, ' ');
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `
      <div class="card-header">
      <strong>Card #${card.id + 1}</strong>
      <button class="highlight-btn" data-table-id="${card.id}">Highlight</button>
      </div>
      <div class="card-info">
      <span>Information</span>
      </div>
      <div class="card-content">
      <code>${escapeHtml(card_content)}</code>
      </div>
    `;
    
    // Add click event to highlight button
    const highlightBtn = div.querySelector('.highlight-btn');
    highlightBtn.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'HIGHLIGHT_CARD',
          cardId: card.id
        });
      });
    });
    
    container.appendChild(div);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"'`=\/]/g, function(s) {
  return ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
    '=': '&#61;',
    '/': '&#47;'
  })[s];
  });
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_CARDS'}, function(response) {
      if (chrome.runtime.lastError) {
        document.getElementById('cards').innerHTML = '<div class="no-cards">Please refresh the page and try again.</div>';
        return;
      }
      renderCards(response && response.cards ? response.cards : []);
    });
  });
});
