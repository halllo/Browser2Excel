// Popup script to display detected elements

let signalRStatus = { isConnected: false };

function renderCards(cards) {
  const container = document.getElementById('cards');
  container.innerHTML = '';
  
  if (!cards || cards.length === 0) {
    container.innerHTML = '<div class="no-cards">No matching elements found on this page.</div>';
    return;
  }

  cards.forEach((card, index) => {
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `
      <div class="card-header">
      <strong>Element #${card.id}</strong>
      <button class="highlight-btn" data-table-id="${card.id}">Highlight</button>
      </div>
      <div class="card-info">
      <span>${card.date ?? 'Unknown Date'}</span>
      </div>
      <div class="card-content">
      <code>${card.arialabel ?? escapeHtml(card.content)}</code>
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
  // Load current selector and initialize UI
  loadCurrentSelector().then(() => {
    // Get cards with current selector
    refreshCards();
  });
  
  // Update SignalR status
  updateSignalRStatus();
  
  // Set up periodic status updates
  setInterval(updateSignalRStatus, 5000);

  // Set up event listeners for configuration
  document.getElementById('saveSelector').addEventListener('click', saveSelector);
  document.getElementById('resetSelector').addEventListener('click', resetSelector);
  document.getElementById('selectorInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveSelector();
    }
  });
});

async function loadCurrentSelector() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([CONFIG.STORAGE_KEY], (result) => {
      const selector = result[CONFIG.STORAGE_KEY] || CONFIG.DEFAULT_SELECTOR;
      document.getElementById('currentSelector').textContent = selector;
      document.getElementById('selectorInput').value = selector;
      resolve();
    });
  });
}

function saveSelector() {
  const newSelector = document.getElementById('selectorInput').value.trim();
  if (!newSelector) {
    alert('Please enter a valid CSS selector');
    return;
  }

  chrome.storage.sync.set({ [CONFIG.STORAGE_KEY]: newSelector }, () => {
    document.getElementById('currentSelector').textContent = newSelector;
    refreshCards();
  });
}

function resetSelector() {
  chrome.storage.sync.set({ [CONFIG.STORAGE_KEY]: CONFIG.DEFAULT_SELECTOR }, () => {
    document.getElementById('currentSelector').textContent = CONFIG.DEFAULT_SELECTOR;
    document.getElementById('selectorInput').value = CONFIG.DEFAULT_SELECTOR;
    refreshCards();
  });
}

function refreshCards() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_CARDS'}, function(response) {
      if (chrome.runtime.lastError) {
        document.getElementById('cards').innerHTML = '<div class="no-cards">Please refresh the page and try again.</div>';
        return;
      }
      renderCards(response && response.cards ? response.cards : []);
    });
  });
}

function updateSignalRStatus() {
  chrome.runtime.sendMessage({type: 'GET_SIGNALR_STATUS'}, (response) => {
    signalRStatus = response || { isConnected: false };
    
    const statusElement = document.getElementById('signalr-status');
    if (statusElement) {
      statusElement.textContent = signalRStatus.isConnected ? 'Connected' : 'Disconnected';
      statusElement.className = signalRStatus.isConnected ? 'status-connected' : 'status-disconnected';
    }
  });
}
