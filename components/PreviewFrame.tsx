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

type DeviceType = 'iphone14' | 'iphoneSE' | 'pixel7' | 'galaxyS23' | 'ipadMini';

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  notch: boolean;
  type: 'ios' | 'android' | 'tablet';
}

const devices: Record<DeviceType, DeviceConfig> = {
  iphone14: { name: 'iPhone 14 Pro', width: 393, height: 852, notch: true, type: 'ios' },
  iphoneSE: { name: 'iPhone SE', width: 375, height: 667, notch: false, type: 'ios' },
  pixel7: { name: 'Pixel 7', width: 412, height: 915, notch: false, type: 'android' },
  galaxyS23: { name: 'Galaxy S23', width: 360, height: 780, notch: false, type: 'android' },
  ipadMini: { name: 'iPad Mini', width: 744, height: 1133, notch: false, type: 'tablet' },
};

export default function PreviewFrame({ 
  url, 
  status, 
  error, 
  onRetry,
  refreshKey = 0,
}: PreviewFrameProps) {
  const [showQR, setShowQR] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('iphone14');
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  const [copySuccess, setCopySuccess] = useState(false);

  const currentDevice = devices[selectedDevice];

  const handleCopyUrl = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Reset loading state when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      setIframeLoading(true);
    }
  }, [refreshKey]);
  
  if (status === 'idle') {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        <div className="p-4 border-b border-orange-500/30 bg-black">
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h2 className="text-lg font-semibold text-white">Preview</h2>
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
      <div className="h-full flex flex-col bg-gray-900">
        <div className="p-4 border-b border-orange-500/30 bg-black">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-orange-400 rounded-full animate-pulse"></div>
            <h2 className="text-lg font-semibold text-white">Preview</h2>
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
      <div className="h-full flex flex-col bg-gray-900">
        <div className="p-4 border-b border-orange-500/30 bg-black">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-red-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-white">Preview</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="bg-red-500/20 border border-red-500 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Generation Failed</h3>
            <p className="text-gray-400 mb-6">{error || 'An unexpected error occurred'}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black py-2 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ready' && url) {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        {/* Expo-like Header */}
        <div className="p-3 border-b border-orange-500/30 bg-black">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">LIVE</span>
              </div>
              <span className="text-gray-600">|</span>
              <h2 className="text-sm font-semibold text-white">Expo Preview</h2>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  setIframeLoading(true);
                  // Force refresh by updating key
                  if (refreshKey !== undefined) {
                    // Trigger parent refresh
                    window.dispatchEvent(new CustomEvent('forcePreviewRefresh'));
                  }
                }}
                className="p-1.5 text-orange-400 hover:bg-gray-900 rounded transition-colors"
                title="Refresh preview"
              >
                <svg className={`h-4 w-4 ${iframeLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'single' ? 'multi' : 'single')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'multi' 
                    ? 'text-orange-400 bg-orange-500/20' 
                    : 'text-orange-400 hover:bg-gray-900'
                }`}
                title={viewMode === 'single' ? 'Multi-device view' : 'Single device view'}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
              <button
                onClick={() => setShowQR(!showQR)}
                className="p-1.5 text-orange-400 hover:bg-gray-900 rounded transition-colors"
                title="Show QR Code"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-orange-400 hover:bg-gray-900 rounded transition-colors"
                title="Open in new tab"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
          
          {/* Device Selector */}
          <div className="relative mb-2">
            <button
              onClick={() => setShowDeviceMenu(!showDeviceMenu)}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-orange-500/30 rounded text-xs text-white transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="h-3 w-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">{currentDevice.name}</span>
              </div>
              <svg className={`h-3 w-3 text-gray-400 transition-transform ${showDeviceMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Device Menu */}
            {showDeviceMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDeviceMenu(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-orange-500/30 rounded shadow-xl z-20 overflow-hidden">
                  {Object.entries(devices).map(([key, device]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedDevice(key as DeviceType);
                        setShowDeviceMenu(false);
                        setIframeLoading(true);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-800 transition-colors flex items-center justify-between ${
                        selectedDevice === key ? 'bg-orange-500/20 text-orange-400' : 'text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>{device.name}</span>
                      </div>
                      <span className="text-gray-500 text-xs">{device.width}×{device.height}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* URL Display with Copy */}
          <div className="bg-gray-900 border border-orange-500/30 rounded px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                {iframeLoading && refreshKey > 0 ? (
                  <svg className="h-3 w-3 text-orange-400 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-3 w-3 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                )}
                <input
                  type="text"
                  value={url}
                  readOnly
                  className="bg-transparent text-xs text-gray-300 flex-1 min-w-0 outline-none cursor-text select-all"
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>
              <button
                onClick={handleCopyUrl}
                className={`p-1 rounded transition-all flex-shrink-0 ${
                  copySuccess 
                    ? 'text-green-400 bg-green-500/20' 
                    : 'text-orange-400 hover:bg-gray-800'
                }`}
                title={copySuccess ? 'Copied!' : 'Copy URL'}
              >
                {copySuccess ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expo Device Preview */}
        <div className="flex-1 overflow-auto bg-gradient-to-b from-black via-gray-900 to-black p-4">
          {viewMode === 'single' ? (
            // Single Device View
            <div className="h-full flex items-center justify-center">
              <div 
                className="relative transition-all duration-300" 
                style={{ 
                  width: '100%', 
                  maxWidth: `${currentDevice.width}px`, 
                  height: currentDevice.type === 'tablet' ? '90%' : '100%',
                  aspectRatio: currentDevice.type === 'tablet' ? `${currentDevice.width}/${currentDevice.height}` : 'auto'
                }}
              >
            {/* Device Frame */}
            <div className={`h-full bg-black shadow-2xl border-4 relative ${
              currentDevice.type === 'tablet' ? 'rounded-2xl border-gray-700' : 'rounded-[3rem] border-gray-800'
            }`} style={{ padding: currentDevice.type === 'tablet' ? '12px' : '12px' }}>
              {/* Notch (only for iPhone 14) */}
              {currentDevice.notch && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20"></div>
              )}
              
              {/* Screen */}
              <div className={`h-full bg-white overflow-hidden relative ${
                currentDevice.type === 'tablet' ? 'rounded-xl' : 'rounded-[2.5rem]'
              }`}>
                {/* Status Bar (only for phones) */}
                {currentDevice.type !== 'tablet' && (
                  <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/10 to-transparent z-10 flex items-center justify-between px-6 pt-2">
                    <span className="text-xs font-semibold text-gray-900">9:41</span>
                    <div className="flex items-center space-x-1">
                      <svg className="h-3 w-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      <svg className="h-3 w-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      <svg className="h-3 w-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Loading Indicator */}
                {iframeLoading && (
                  <div className="absolute inset-0 bg-white flex items-center justify-center z-20">
                    <div className="text-center">
                      <div className="inline-block mb-3">
                        <svg className="h-16 w-16 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <p className="text-gray-600 text-sm font-medium">Loading Expo App...</p>
                      <p className="text-gray-400 text-xs mt-1">Connecting to development server</p>
                    </div>
                  </div>
                )}
                
                {/* App Content */}
                <iframe
                  key={`preview-${refreshKey}`}
                  src={url}
                  className="w-full h-full border-0 bg-white"
                  title="Expo App Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  onLoad={() => setIframeLoading(false)}
                />
              </div>

              {/* Home Indicator (only for iOS phones) */}
              {currentDevice.type === 'ios' && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
              )}
            </div>

            {/* Device Info Badge */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full border border-orange-500/30">
              <span className="text-xs text-gray-400">{currentDevice.width} × {currentDevice.height}</span>
            </div>
          </div>
        </div>
          ) : (
            // Multi-Device View
            <div className="h-full overflow-x-auto">
              <div className="flex gap-6 h-full items-center justify-center min-w-max px-4">
                {/* iPhone */}
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-400 mb-2 font-medium">iPhone 14 Pro</div>
                  <div 
                    className="relative" 
                    style={{ width: `${devices.iphone14.width * 0.7}px`, height: '85%' }}
                  >
                    <div className="h-full bg-black shadow-2xl border-4 rounded-[2.5rem] border-gray-800 relative" style={{ padding: '10px' }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-2xl z-20"></div>
                      <div className="h-full bg-white overflow-hidden relative rounded-[2rem]">
                        <iframe
                          key={`iphone-${refreshKey}`}
                          src={url}
                          className="w-full h-full border-0 bg-white"
                          title="iPhone Preview"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                      </div>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{devices.iphone14.width}×{devices.iphone14.height}</div>
                </div>

                {/* Android Phone */}
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-400 mb-2 font-medium">Pixel 7</div>
                  <div 
                    className="relative" 
                    style={{ width: `${devices.pixel7.width * 0.7}px`, height: '85%' }}
                  >
                    <div className="h-full bg-black shadow-2xl border-4 rounded-[2.5rem] border-gray-800 relative" style={{ padding: '10px' }}>
                      <div className="h-full bg-white overflow-hidden relative rounded-[2rem]">
                        <iframe
                          key={`android-${refreshKey}`}
                          src={url}
                          className="w-full h-full border-0 bg-white"
                          title="Android Preview"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{devices.pixel7.width}×{devices.pixel7.height}</div>
                </div>

                {/* Tablet */}
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-400 mb-2 font-medium">iPad Mini</div>
                  <div 
                    className="relative" 
                    style={{ width: `${devices.ipadMini.width * 0.5}px`, height: '85%' }}
                  >
                    <div className="h-full bg-black shadow-2xl border-4 rounded-2xl border-gray-700 relative" style={{ padding: '10px' }}>
                      <div className="h-full bg-white overflow-hidden relative rounded-xl">
                        <iframe
                          key={`tablet-${refreshKey}`}
                          src={url}
                          className="w-full h-full border-0 bg-white"
                          title="Tablet Preview"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{devices.ipadMini.width}×{devices.ipadMini.height}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* QR Code Modal */}
        {showQR && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
            <div className="bg-gray-900 border-2 border-orange-500 p-6 rounded-xl shadow-2xl max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">Scan with Expo Go</h3>
                <p className="text-xs text-gray-400">Open the Expo Go app and scan this QR code</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`}
                  alt="QR Code"
                  className="w-full h-auto"
                />
              </div>
              <div className="mt-4 space-y-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black text-center rounded-lg text-sm font-medium transition-all"
                >
                  Open in Browser
                </a>
                <button
                  onClick={() => setShowQR(false)}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
