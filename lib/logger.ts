import { LogEntry } from '@/components/LogsPanel';

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'api';

class Logger {
  private listeners: ((log: LogEntry) => void)[] = [];
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  subscribe(listener: (log: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private addLog(level: LogLevel, message: string, details?: any, source?: string) {
    const log: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      details,
      source,
    };

    this.logs.push(log);
    
    // Keep only last maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify all listeners
    this.listeners.forEach(listener => listener(log));
  }

  info(message: string, details?: any, source?: string) {
    this.addLog('info', message, details, source);
  }

  warn(message: string, details?: any, source?: string) {
    this.addLog('warn', message, details, source);
  }

  error(message: string, details?: any, source?: string) {
    this.addLog('error', message, details, source);
  }

  success(message: string, details?: any, source?: string) {
    this.addLog('success', message, details, source);
  }

  api(method: string, url: string, status?: number, details?: any) {
    const message = `${method} ${url}${status ? ` → ${status}` : ''}`;
    this.addLog('api', message, { method, url, status, ...details }, 'API');
  }

  buttonClick(buttonName: string, details?: any) {
    this.addLog('info', `Button clicked: ${buttonName}`, details, 'Button');
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(listener => {
      // Notify with a clear event
      listener({
        id: 'clear',
        timestamp: new Date(),
        level: 'info',
        message: 'Logs cleared',
      });
    });
  }
}

export const logger = new Logger();

// Intercept console methods
if (typeof window !== 'undefined') {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  console.log = (...args) => {
    originalConsole.log(...args);
    logger.info(args.join(' '), args.length > 1 ? args : undefined, 'Console');
  };

  console.warn = (...args) => {
    originalConsole.warn(...args);
    logger.warn(args.join(' '), args.length > 1 ? args : undefined, 'Console');
  };

  console.error = (...args) => {
    originalConsole.error(...args);
    logger.error(args.join(' '), args.length > 1 ? args : undefined, 'Console');
  };

  console.info = (...args) => {
    originalConsole.info(...args);
    logger.info(args.join(' '), args.length > 1 ? args : undefined, 'Console');
  };

  // Intercept fetch calls
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    const method = options?.method || 'GET';
    const urlString = typeof url === 'string' ? url : url.toString();
    
    logger.api(method, urlString, undefined, { options });
    
    try {
      const response = await originalFetch(...args);
      logger.api(method, urlString, response.status, {
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
      return response;
    } catch (error: any) {
      logger.error(`Fetch failed: ${method} ${urlString}`, { error: error.message }, 'API');
      throw error;
    }
  };
}

