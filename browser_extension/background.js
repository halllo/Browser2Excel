// Background script for Browser2Excel with SignalR support
let signalRClient = null;

// Load SignalR libraries at the top level (synchronous for service workers)
try {
  importScripts('signalr.min.js');
  importScripts('signalr-client.js');
  console.log('SignalR libraries loaded successfully');
} catch (error) {
  console.error('Failed to load SignalR libraries:', error);
}

// Initialize SignalR when extension starts
chrome.runtime.onStartup.addListener(initializeSignalR);
chrome.runtime.onInstalled.addListener(initializeSignalR);

async function initializeSignalR() {
  try {
    // Initialize SignalR client
    signalRClient = new SignalRClient();
    await signalRClient.init();
    
    console.log('SignalR client initialized in background script');
  } catch (error) {
    console.error('Failed to initialize SignalR:', error);
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SIGNALR_STATUS':
      if (signalRClient) {
        sendResponse(signalRClient.getConnectionState());
      } else {
        sendResponse({ isConnected: false, connectionState: 'disconnected' });
      }
      return true; // Keep message channel open for async response
            
    case 'RESPONSE_ELEMENT_DATA':
      if (signalRClient) {
        signalRClient.responseElementData(message.data);
      }
      break;
  }
});

// Handle tab updates to potentially send data
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && signalRClient?.isConnected) {
    // Optionally notify server about page load
    console.log('Page loaded:', tab.url);
  }
});
