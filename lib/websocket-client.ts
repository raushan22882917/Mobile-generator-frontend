/**
 * WebSocket client for real-time generation updates
 */

export interface WebSocketMessage {
  type: 'progress' | 'complete' | 'error';
  data: {
    progress: number;
    message: string;
    preview_url?: string;
    project_id?: string;
    status?: string;
    error?: string;
  };
}

export interface WebSocketCallbacks {
  onProgress?: (progress: number, message: string) => void;
  onPreviewReady?: (previewUrl: string) => void;
  onComplete?: (data: WebSocketMessage['data']) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  onOpen?: () => void;
}

export class GenerationWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: WebSocketCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;

  constructor(url: string, callbacks: WebSocketCallbacks) {
    this.url = url;
    this.callbacks = callbacks;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    
    try {
      // Convert http/https to ws/wss
      let wsUrl = this.url;
      if (wsUrl.startsWith('http://')) {
        wsUrl = wsUrl.replace(/^http/, 'ws');
      } else if (wsUrl.startsWith('https://')) {
        wsUrl = wsUrl.replace(/^https/, 'wss');
      }
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.callbacks.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks.onError?.('WebSocket connection error');
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed', { code: event.code, reason: event.reason });
        
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          // Attempt to reconnect
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          this.callbacks.onClose?.();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.callbacks.onError?.('Failed to establish WebSocket connection');
    }
  }

  private handleMessage(message: any): void {
    // Validate message structure
    if (!message || typeof message !== 'object') {
      console.warn('Invalid message format:', message);
      return;
    }

    // Handle messages that might not have the expected structure
    const messageType = message.type;
    const messageData = message.data || message;

    // Helper function to extract and validate preview URL
    const extractPreviewUrl = (data: any): string | null => {
      if (!data) return null;
      
      // Check multiple possible locations for preview URL
      const previewUrl = data.preview_url || data.previewUrl || data.url || data.preview;
      
      if (previewUrl && typeof previewUrl === 'string') {
        // Validate URL format
        try {
          const url = new URL(previewUrl);
          // Ensure it's http or https
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            return previewUrl;
          }
        } catch (e) {
          // If URL parsing fails, try to fix common issues
          if (previewUrl.startsWith('//')) {
            return `https:${previewUrl}`;
          }
          if (!previewUrl.startsWith('http')) {
            return `https://${previewUrl}`;
          }
          return previewUrl;
        }
      }
      
      return null;
    };

    switch (messageType) {
      case 'progress':
        if (messageData && typeof messageData.progress === 'number') {
          const progressMessage = messageData.message || 'Processing...';
          this.callbacks.onProgress?.(messageData.progress, progressMessage);
          
          // Check for preview URL in progress messages
          const previewUrl = extractPreviewUrl(messageData);
          if (previewUrl) {
            console.log('Preview URL found in progress message:', previewUrl);
            this.callbacks.onPreviewReady?.(previewUrl);
          }
        } else {
          console.warn('Invalid progress message format:', message);
        }
        break;

      case 'complete':
        if (messageData) {
          // Check for preview URL in complete message
          const previewUrl = extractPreviewUrl(messageData);
          if (previewUrl) {
            console.log('Preview URL found in complete message:', previewUrl);
            this.callbacks.onPreviewReady?.(previewUrl);
          }
          this.callbacks.onComplete?.(messageData);
        } else {
          console.warn('Invalid complete message format:', message);
        }
        break;

      case 'error':
        const errorMessage = messageData?.error || message.error || message.message || 'Unknown error occurred';
        this.callbacks.onError?.(errorMessage);
        break;

      default:
        // Handle messages without a type field - might be progress updates
        if (messageData && typeof messageData.progress === 'number') {
          this.callbacks.onProgress?.(messageData.progress, messageData.message || 'Processing...');
          const previewUrl = extractPreviewUrl(messageData);
          if (previewUrl) {
            console.log('Preview URL found in untyped message:', previewUrl);
            this.callbacks.onPreviewReady?.(previewUrl);
          }
        } else {
          // Check if this is a preview URL notification without progress
          const previewUrl = extractPreviewUrl(messageData || message);
          if (previewUrl) {
            console.log('Preview URL found in message without progress:', previewUrl);
            this.callbacks.onPreviewReady?.(previewUrl);
          } else {
            console.warn('Unknown message type:', messageType, 'Message:', message);
          }
        }
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Helper function to create a WebSocket connection for generation updates
 */
export function createGenerationWebSocket(
  websocketUrl: string,
  callbacks: WebSocketCallbacks
): GenerationWebSocketClient {
  const client = new GenerationWebSocketClient(websocketUrl, callbacks);
  client.connect();
  return client;
}

