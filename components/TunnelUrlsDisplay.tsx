'use client';

import React, { useState } from 'react';
import { TunnelURL } from '@/lib/api-client';

interface TunnelUrlsDisplayProps {
  tunnelUrls?: TunnelURL[];
  latestTunnelUrl?: string | null;
  activeTunnelCount?: number;
}

export default function TunnelUrlsDisplay({
  tunnelUrls,
  latestTunnelUrl,
  activeTunnelCount,
}: TunnelUrlsDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!tunnelUrls || tunnelUrls.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Sort by created_at descending (newest first)
  const sortedUrls = [...tunnelUrls].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg text-sm font-medium transition-all"
        title={`${tunnelUrls.length} tunnel URL(s) - ${activeTunnelCount || 0} active`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span>Tunnels</span>
        {activeTunnelCount !== undefined && activeTunnelCount > 0 && (
          <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {activeTunnelCount}
          </span>
        )}
        <span className="text-xs opacity-70">({tunnelUrls.length})</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900 border-2 border-orange-500/50 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-orange-500/30">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Tunnel URLs</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {activeTunnelCount || 0} active • {tunnelUrls.length} total
              </p>
            </div>

            <div className="p-2">
              {sortedUrls.map((tunnel, index) => (
                <div
                  key={index}
                  className={`p-3 mb-2 rounded-lg border ${
                    tunnel.is_active
                      ? 'bg-green-900/20 border-green-500/50'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <a
                        href={tunnel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 font-mono truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tunnel.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {tunnel.is_active && (
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                      {tunnel.url === latestTunnelUrl && (
                        <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDate(tunnel.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Port {tunnel.port}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

