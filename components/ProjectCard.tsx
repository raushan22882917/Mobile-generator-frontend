'use client';

import React, { useState } from 'react';
import { ProjectListItem } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: ProjectListItem;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleClick = () => {
    router.push(`/project/${project.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer group"
    >
      {/* Preview Section */}
      {(project.preview_url || project.latest_tunnel_url || (project.tunnel_urls && project.tunnel_urls.length > 0)) ? (
        <div className="relative w-full h-48 bg-gray-100 border-b border-gray-200">
          {/* Ngrok URL Display */}
          <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {(() => {
              const displayUrl = project.latest_tunnel_url || project.preview_url || (project.tunnel_urls && project.tunnel_urls.length > 0 ? project.tunnel_urls[project.tunnel_urls.length - 1].url : null);
              return displayUrl ? (
                <>
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-xs text-white hover:text-green-400 transition-colors truncate font-mono"
                    title={displayUrl}
                  >
                    {displayUrl}
                  </a>
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-green-400 hover:text-green-300 transition-colors flex-shrink-0"
                    title="Open in new tab"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {project.active_tunnel_count !== undefined && project.active_tunnel_count > 0 && (
                    <span className="text-xs text-green-400 bg-green-400/20 px-2 py-0.5 rounded">
                      {project.active_tunnel_count} active
                    </span>
                  )}
                </>
              ) : null;
            })()}
          </div>
          
          {previewLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-orange-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-xs text-gray-500">Loading preview...</p>
              </div>
            </div>
          )}
          {previewError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center p-4">
                <svg className="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-500 mb-2">Preview unavailable</p>
                {(() => {
                  const errorUrl = project.latest_tunnel_url || project.preview_url;
                  return errorUrl ? (
                    <a
                      href={errorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-orange-600 hover:text-orange-700 underline"
                    >
                      {errorUrl}
                    </a>
                  ) : null;
                })()}
              </div>
            </div>
          ) : (
            <iframe
              src={project.latest_tunnel_url || project.preview_url || ''}
              className="w-full h-full border-0"
              onLoad={() => setPreviewLoading(false)}
              onError={() => {
                setPreviewError(true);
                setPreviewLoading(false);
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title={`Preview of ${project.name || project.id}`}
            />
          )}
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 border-b border-gray-200 flex items-center justify-center">
          <div className="text-center p-4">
            <svg className="h-16 w-16 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">No preview available</p>
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
              {project.name || `Project ${project.id.substring(0, 8)}`}
            </h3>
            <p className="text-sm text-gray-500 font-mono">
              {project.id.substring(0, 8)}...
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
            {getStatusIcon(project.status)}
            <span className="capitalize">{project.status}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDate(project.created_at)}
          </span>
          {(() => {
            const previewUrl = project.latest_tunnel_url || project.preview_url;
            return previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Preview
                {project.tunnel_urls && project.tunnel_urls.length > 1 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                    {project.tunnel_urls.length}
                  </span>
                )}
              </a>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}

