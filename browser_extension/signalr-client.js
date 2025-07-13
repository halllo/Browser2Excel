// SignalR client for Browser2Excel
// This module handles real-time communication with the server

class SignalRClient {
  constructor() {
    this.connection = null;
    this.serverUrl = 'https://localhost:7026/hub';
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async init() {
    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(this.serverUrl)
        .withAutomaticReconnect()
        .build();

      this.setupEventHandlers();
      await this.start();
    } catch (error) {
      console.error('Failed to initialize SignalR connection:', error);
    }
  }

  setupEventHandlers() {
    // Connection events
    this.connection.onreconnecting(() => {
      console.log('SignalR: Attempting to reconnect...');
      this.isConnected = false;
    });

    this.connection.onreconnected(() => {
      console.log('SignalR: Reconnected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.connection.onclose(() => {
      console.log('SignalR: Connection closed');
      this.isConnected = false;
      this.attemptReconnect();
    });

    // Browser2Excel specific events
    this.connection.on('RequestElementData', (data) => {
      console.log('Server requesting element data for:', data);
      // Send to content script in active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'REQUEST_ELEMENT_DATA',
            data: { data }
          });
        } else {
          console.warn('No active tab found to send element data request');
          this.responseElementData({
            url: "",
            elements: []
          })
        }
      });
    });
  }

  async start() {
    try {
      await this.connection.start();
      console.log('SignalR connection started successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Failed to start SignalR connection:', error);
      this.attemptReconnect();
    }
  }

  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.start();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  async responseElementData(data) {
    if (!this.isConnected) {
      console.warn('SignalR not connected, cannot send element data');
      return;
    }

    try {
      await this.connection.invoke('ResponseElementData', data);
      console.log('Element data sent to server successfully');
    } catch (error) {
      console.error('Failed to send element data:', error);
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connection?.state,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.isConnected = false;
    }
  }
}

// Export for use in other extension files
// Use globalThis instead of window for service worker compatibility
globalThis.SignalRClient = SignalRClient;
