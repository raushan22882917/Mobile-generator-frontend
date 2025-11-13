'use client';

import { useState, useEffect } from 'react';

interface PreviewFrameProps {
  url: string | null;
  status: 'idle' | 'generating' | 'ready' | 'error';
  error?: string;
  onRetry?: () => void;
  onDownload?: () => void;
  projectId?: string;
  refreshKey?: number;
}

// Medium phone - 1080×2400 (Pixel 7 - scaled to fit preview)
const deviceConfig = {
  name: 'Pixel 7 (FHD+)',
  width: 412,
  height: 915,
};

export default function PreviewFrame({ 
  url, 
  status, 
  error, 
  onRetry,
  refreshKey = 0,
}: PreviewFrameProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Reset loading state when refreshKey or url changes
  useEffect(() => {
    if (refreshKey > 0 && autoRefresh) {
      setIframeLoading(true);
      setIframeError(null);
    }
  }, [refreshKey, autoRefresh, url]);

  // Timeout to detect if iframe is stuck loading
  useEffect(() => {
    if (status === 'ready' && url && iframeLoading) {
      const timeout = setTimeout(() => {
        if (iframeLoading) {
          console.warn('Preview iframe loading timeout');
          setIframeError('Preview is taking too long to load. The server may be unreachable or the URL may be invalid.');
          setIframeLoading(false);
        }
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [status, url, iframeLoading]);

  
  if (status === 'idle') {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        <div className="p-4 border-b-2 border-orange-500/40 bg-gradient-to-r from-black via-gray-900 to-black shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-2 rounded-lg shadow-md">
              <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">Preview</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="bg-black rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No preview yet</p>
            <p className="text-xs text-gray-600 mt-1">Create an app to see preview</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        <div className="p-4 border-b-2 border-orange-500/40 bg-gradient-to-r from-black via-gray-900 to-black shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-2 rounded-lg shadow-md animate-pulse">
              <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">Preview</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block mb-4">
              <div className="relative">
                <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full p-4 animate-pulse">
                  <svg className="h-12 w-12 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <p className="text-white font-medium">Building your app...</p>
            <p className="text-gray-400 text-sm mt-1">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        <div className="p-4 border-b-2 border-red-500/40 bg-gradient-to-r from-black via-gray-900 to-black shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-2 rounded-lg shadow-md">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">Preview Error</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-2xl w-full">
            <div className="bg-red-500/20 border border-red-500 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-3">Generation Failed</h3>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6 text-left">
              <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">
                {error || 'An unexpected error occurred'}
              </p>
            </div>
            
            {/* Show helpful suggestions for common errors */}
            {error && (
              <div className="mb-6">
                {error.includes('expo') && error.includes('not installed') && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-left">
                    <p className="text-yellow-400 text-sm font-medium mb-2">💡 This is a backend configuration issue:</p>
                    <ul className="text-gray-300 text-xs space-y-1 list-disc list-inside">
                      <li>The generated project is missing the <code className="bg-gray-800 px-1 rounded">expo</code> package</li>
                      <li>This should be fixed in the backend generation process</li>
                      <li>Ensure <code className="bg-gray-800 px-1 rounded">npm install expo</code> runs during project setup</li>
                    </ul>
                  </div>
                )}
                {error.includes('npm install') && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-left">
                    <p className="text-blue-400 text-sm font-medium mb-2">💡 Dependency Installation Issue:</p>
                    <p className="text-gray-300 text-xs">The project dependencies failed to install. This may be a temporary issue or a problem with the package.json configuration.</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-3 justify-center">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black py-2 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={() => {
                  // Clear error and reset
                  window.location.reload();
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium transition-all"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ready') {
    // Show error if URL is missing
    if (!url) {
      return (
        <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-black">
          <div className="p-4 border-b-2 border-orange-500/40 bg-gradient-to-r from-black via-gray-900 to-black shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-2 rounded-lg shadow-md">
                <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">Preview</h2>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Preview URL Not Available</h3>
              <p className="text-gray-400 mb-4">The project is ready but no preview URL was provided. The server may still be starting up.</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black py-2 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md"
                >
                  Check Again
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Normal preview rendering when URL is available
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        {/* Slim Header */}
        <div className="px-4 py-2 border-b border-orange-500/20 bg-gradient-to-r from-black via-gray-900 to-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400 font-medium">LIVE</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400">Expo Preview</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-1 rounded transition-colors ${
                  autoRefresh 
                    ? 'text-green-400 bg-green-500/10' 
                    : 'text-gray-500 hover:bg-gray-800'
                }`}
                title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setIframeLoading(true);
                  if (refreshKey !== undefined) {
                    window.dispatchEvent(new CustomEvent('forcePreviewRefresh'));
                  }
                }}
                className="p-1 text-orange-400 hover:bg-gray-800 rounded transition-colors"
                title="Refresh"
              >
                <svg className={`h-3.5 w-3.5 ${iframeLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-orange-400 hover:bg-gray-800 rounded transition-colors"
                title="Open in new tab"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Device Preview */}
        <div className="flex-1 overflow-auto bg-gradient-to-b from-black via-gray-900 to-black p-6">
          <div className="h-full flex items-center justify-center">
            <div 
              className="relative transition-all duration-300" 
              style={{ 
                width: '100%', 
                maxWidth: `${deviceConfig.width}px`, 
                height: '100%'
              }}
            >
              {/* Device Frame - Slim Android Phone */}
              <div className="h-full bg-black shadow-2xl border-2 rounded-[2.5rem] border-gray-700 relative" style={{ padding: '8px' }}>
                {/* Screen */}
                <div className="h-full bg-white overflow-hidden relative rounded-[2rem]">
                  {/* Status Bar */}
                  <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/5 to-transparent z-10 flex items-center justify-between px-5 pt-1.5">
                    <span className="text-xs font-semibold text-gray-900">9:41</span>
                    <div className="flex items-center space-x-1">
                      <svg className="h-2.5 w-2.5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      <svg className="h-2.5 w-2.5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      <svg className="h-2.5 w-2.5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                      </svg>
                    </div>
                  </div>

                  {/* Error Message */}
                  {iframeError && (
                    <div className="absolute inset-0 bg-white flex items-center justify-center z-30">
                      <div className="text-center max-w-md p-6">
                        <div className="inline-block mb-4">
                          <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Preview Failed to Load</h3>
                        <p className="text-gray-600 text-xs mb-4">{iframeError}</p>
                        {url && (
                          <div className="space-y-2">
                            <div className="flex gap-2 justify-center mt-4">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-lg transition-all"
                              >
                                Open in New Tab
                              </a>
                              <button
                                onClick={() => {
                                  setIframeError(null);
                                  setIframeLoading(true);
                                }}
                                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs rounded-lg transition-all"
                              >
                                Retry
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Loading Indicator */}
                  {iframeLoading && !iframeError && (
                    <div className="absolute inset-0 bg-white flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="inline-block mb-2">
                          <svg className="h-12 w-12 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <p className="text-gray-600 text-xs font-medium">Loading Expo App...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* App Content */}
                  {!iframeError && (
                    <iframe
                      key={`preview-${refreshKey}`}
                      src={url || undefined}
                      className="w-full h-full border-0 bg-white"
                      title="Expo App Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      onLoad={() => {
                        setIframeLoading(false);
                        setIframeError(null);
                      }}
                      onError={() => {
                        setIframeError('Failed to load preview. The URL may be invalid or the server may be unreachable.');
                        setIframeLoading(false);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
