import { LogEntry } from '@/components/LogsPanel';
import { apiClient } from './api-client';

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'api';

class Logger {
  private listeners: ((log: LogEntry) => void)[] = [];
  // Minimal in-memory storage only for current session UI display (not persisted)
  private sessionLogs: LogEntry[] = [];
  private maxSessionLogs = 100;

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

    // Store only in memory for current session UI (not persisted to disk/storage)
    this.sessionLogs.push(log);
    
    // Keep only last maxSessionLogs for UI display
    if (this.sessionLogs.length > this.maxSessionLogs) {
      this.sessionLogs = this.sessionLogs.slice(-this.maxSessionLogs);
    }

    // Notify all listeners for real-time UI updates
    this.listeners.forEach(listener => listener(log));

    // Send log to backend for persistence (non-blocking, fire-and-forget)
    if (typeof window !== 'undefined') {
      this.sendLogToBackend(log).catch(() => {
        // Silently fail - logging shouldn't break the app
      });
    }
  }

  private async sendLogToBackend(log: LogEntry): Promise<void> {
    try {
      // Send log to backend API endpoint if available
      // This is a non-blocking operation
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: log.level,
          message: log.message,
          details: log.details,
          source: log.source,
          timestamp: log.timestamp.toISOString(),
        }),
      }).catch(() => {
        // Ignore errors - backend endpoint may not exist yet
      });
    } catch (error) {
      // Ignore errors - logging shouldn't break the app
    }
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
    // Return only session logs (not persisted)
    return [...this.sessionLogs];
  }

  clear() {
    // Clear only session logs (backend logs remain)
    this.sessionLogs = [];
    this.listeners.forEach(listener => {
      // Notify with a clear event
      listener({
        id: 'clear',
        timestamp: new Date(),
        level: 'info',
        message: 'Session logs cleared',
      });
    });
  }

  /**
   * Fetch logs from backend for a specific project
   */
  async fetchProjectLogs(projectId: string, options?: { hours?: number; limit?: number; severity?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' }): Promise<LogEntry[]> {
    try {
      const response = await apiClient.getLogs(projectId, options);
      // Convert backend log format to LogEntry format
      return (response.logs || []).map((log: any) => ({
        id: log.id || `${Date.now()}-${Math.random()}`,
        timestamp: new Date(log.timestamp || log.time || Date.now()),
        level: this.mapSeverityToLevel(log.severity || log.level),
        message: log.message || log.text || '',
        details: log.details || log.data,
        source: log.source || 'Backend',
      }));
    } catch (error) {
      console.error('Failed to fetch logs from backend:', error);
      return [];
    }
  }

  private mapSeverityToLevel(severity: string): LogEntry['level'] {
    const upperSeverity = severity?.toUpperCase() || '';
    if (upperSeverity.includes('ERROR') || upperSeverity.includes('CRITICAL')) return 'error';
    if (upperSeverity.includes('WARN') || upperSeverity.includes('WARNING')) return 'warn';
    if (upperSeverity.includes('SUCCESS')) return 'success';
    if (upperSeverity.includes('API')) return 'api';
    return 'info';
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

