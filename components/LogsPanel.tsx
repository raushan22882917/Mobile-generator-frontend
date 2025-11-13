'use client';

import { useState, useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success' | 'api';
  message: string;
  details?: any;
  source?: string;
}

interface LogsPanelProps {
  logs: LogEntry[];
  onClear?: () => void;
  projectId?: string | null;
  showBackendLogs?: boolean;
}

export default function LogsPanel({ logs, onClear, projectId, showBackendLogs = false }: LogsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'success' | 'api'>('all');
  const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]);
  const [loadingBackendLogs, setLoadingBackendLogs] = useState(false);
  const [hoursFilter, setHoursFilter] = useState(24);
  const [limitFilter, setLimitFilter] = useState(1000);
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const loadBackendLogs = async () => {
    if (!projectId) return;
    
    setLoadingBackendLogs(true);
    try {
      const params = new URLSearchParams({
        hours: hoursFilter.toString(),
        limit: limitFilter.toString(),
      });
      if (severityFilter) {
        params.append('severity', severityFilter);
      }
      
      const response = await fetch(`/api/logs/${projectId}?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Convert backend logs to LogEntry format
        const convertedLogs: LogEntry[] = (data.logs || []).map((log: any) => ({
          id: log.id || `${log.timestamp}-${Math.random()}`,
          timestamp: new Date(log.timestamp || log.created_at),
          level: (log.severity?.toLowerCase() || log.level?.toLowerCase() || 'info') as LogEntry['level'],
          message: log.message || log.content || JSON.stringify(log),
          details: log,
          source: log.source || 'Backend',
        }));
        setBackendLogs(convertedLogs);
      }
    } catch (error) {
      console.error('Failed to load backend logs:', error);
    } finally {
      setLoadingBackendLogs(false);
    }
  };

  // Fetch backend logs if enabled
  useEffect(() => {
    if (showBackendLogs && projectId) {
      loadBackendLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBackendLogs, projectId, hoursFilter, limitFilter, severityFilter]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, backendLogs, autoScroll]);

  // Combine frontend and backend logs
  const allLogs = showBackendLogs ? [...backendLogs, ...logs] : logs;
  
  const filteredLogs = filter === 'all' 
    ? allLogs 
    : allLogs.filter(log => log.level === filter);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'api': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500/10 border-red-500/30';
      case 'warn': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'success': return 'bg-green-500/10 border-green-500/30';
      case 'api': return 'bg-blue-500/10 border-blue-500/30';
      default: return 'bg-gray-800/50 border-gray-700/30';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'success': return '✅';
      case 'api': return '🌐';
      default: return 'ℹ️';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-black via-gray-900 to-black border-b-2 border-orange-500/40 shadow-md">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-bold text-white">Logs</h3>
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
            {filteredLogs.length} entries
          </span>
          {showBackendLogs && projectId && (
            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30">
              Backend Logs
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Buttons */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {(['all', 'api', 'error', 'warn', 'success', 'info'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  filter === level
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          {/* Auto-scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 text-xs rounded transition-all ${
              autoScroll
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            {autoScroll ? '📌 Auto' : '📌'}
          </button>
          {/* Clear Button */}
          {onClear && (
            <button
              onClick={onClear}
              className="px-3 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-all"
            >
              Clear
            </button>
          )}
          {/* Refresh Backend Logs */}
          {showBackendLogs && projectId && (
            <button
              onClick={loadBackendLogs}
              disabled={loadingBackendLogs}
              className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-all disabled:opacity-50"
              title="Refresh backend logs"
            >
              {loadingBackendLogs ? '⏳' : '🔄'} Refresh
            </button>
          )}
        </div>
      </div>

      {/* Backend Logs Filters */}
      {showBackendLogs && projectId && (
        <div className="px-4 py-2 bg-gray-900/50 border-b border-orange-500/20 flex items-center gap-2 flex-wrap">
          <label className="text-xs text-gray-400">Hours:</label>
          <select
            value={hoursFilter}
            onChange={(e) => setHoursFilter(Number(e.target.value))}
            className="px-2 py-1 text-xs bg-gray-800 text-white border border-gray-700 rounded"
          >
            <option value={1}>1 hour</option>
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
            <option value={72}>72 hours</option>
            <option value={168}>7 days</option>
          </select>
          
          <label className="text-xs text-gray-400 ml-2">Limit:</label>
          <select
            value={limitFilter}
            onChange={(e) => setLimitFilter(Number(e.target.value))}
            className="px-2 py-1 text-xs bg-gray-800 text-white border border-gray-700 rounded"
          >
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value={5000}>5000</option>
          </select>
          
          <label className="text-xs text-gray-400 ml-2">Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-800 text-white border border-gray-700 rounded"
          >
            <option value="">All</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
            <option value="DEBUG">DEBUG</option>
          </select>
        </div>
      )}

      {/* Logs Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No logs to display</p>
            <p className="text-xs mt-2">Logs will appear here as you interact with the app</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-lg border ${getLevelBg(log.level)} transition-all hover:opacity-80`}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm">{getLevelIcon(log.level)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold ${getLevelColor(log.level)}`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    {log.source && (
                      <span className="text-gray-600 text-xs bg-gray-800 px-2 py-0.5 rounded">
                        {log.source}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-300 whitespace-pre-wrap break-words">
                    {log.message}
                  </div>
                  {log.details && (
                    <details className="mt-2">
                      <summary className="text-gray-400 text-xs cursor-pointer hover:text-gray-300">
                        View details
                      </summary>
                      <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-gray-400 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

