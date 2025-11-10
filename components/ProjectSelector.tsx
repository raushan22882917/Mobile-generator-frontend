'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  status: string;
  preview_url: string | null;
  preview_urls: string[];
  created_at: string;
  last_active: string;
  prompt: string;
  is_active: boolean;
}

interface ProjectSelectorProps {
  onSelectProject: (projectId: string) => void;
  currentProjectId: string | null;
}

export default function ProjectSelector({ onSelectProject, currentProjectId }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/projects`);
      
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err: any) {
      console.error('Error loading projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const handleSelectProject = (projectId: string) => {
    onSelectProject(projectId);
    setIsOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'inactive':
        return 'bg-gray-700 text-gray-400 border border-gray-600';
      default:
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    }
  };

  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-black border border-orange-500/50 rounded-lg hover:border-orange-500 transition-colors"
      >
        <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="text-sm font-medium text-white">
          {currentProject ? currentProject.name : 'Select Project'}
        </span>
        <svg className={`h-4 w-4 text-orange-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-96 bg-gray-900 border-2 border-orange-500 rounded-lg shadow-2xl z-20 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-3 border-b border-orange-500/30 bg-black flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Your Projects</h3>
              <button
                onClick={loadProjects}
                disabled={loading}
                className="p-1 hover:bg-gray-900 rounded transition-colors"
                title="Refresh"
              >
                <svg className={`h-4 w-4 text-orange-400 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  <p className="text-sm text-gray-400 mt-2">Loading projects...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-8 w-8 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    onClick={loadProjects}
                    className="mt-2 text-sm text-orange-400 hover:text-yellow-400"
                  >
                    Try again
                  </button>
                </div>
              ) : projects.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="bg-black rounded-full p-3 w-14 h-14 mx-auto mb-2 flex items-center justify-center">
                    <svg className="h-7 w-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">No projects yet</p>
                  <p className="text-xs text-gray-600 mt-1">Create your first project</p>
                </div>
              ) : (
                <div className="divide-y divide-orange-500/20">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project.id)}
                      className={`w-full p-3 text-left hover:bg-black transition-colors ${
                        project.id === currentProjectId ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-l-2 border-orange-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-white truncate">
                              {project.name}
                            </h4>
                            {project.is_active && (
                              <span className="flex-shrink-0 h-2 w-2 bg-green-500 rounded-full animate-pulse" title="Active"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {project.prompt}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 ml-2 px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(project.last_active)}
                        </span>
                        {project.preview_urls.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {project.preview_urls.length} preview{project.preview_urls.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {projects.length > 0 && (
              <div className="p-2 border-t border-orange-500/30 bg-black">
                <p className="text-xs text-gray-500 text-center">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} total
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
