'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

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
  onSelectProject: (projectId: string, project?: Project) => void;
  currentProjectId: string | null;
}

export default function ProjectSelector({ onSelectProject, currentProjectId }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadProjects = async (retries = 3) => {
    setLoading(true);
    setError(null);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Try both endpoints - projects (database) and bucket-projects (storage)
        const [projectsResponse, bucketResponse] = await Promise.allSettled([
          fetch('/api/projects').then(r => r.ok ? r.json() : null).catch(() => null),
          apiClient.listBucketProjects().catch(() => null),
        ]);
        
        let projectsList: Project[] = [];
        
        // Process /api/projects response
        if (projectsResponse.status === 'fulfilled' && projectsResponse.value) {
          const projectsData = projectsResponse.value;
          const dbProjects = projectsData.projects || [];
          console.log('Database projects:', dbProjects.length);
          projectsList = [...projectsList, ...dbProjects];
        }
        
        // Process bucket-projects response
        if (bucketResponse.status === 'fulfilled' && bucketResponse.value) {
          const bucketData = bucketResponse.value;
          const bucketProjects = bucketData.projects || [];
          console.log('Bucket projects raw:', bucketProjects.length, bucketProjects);
          
          // Convert bucket projects to Project format if needed
          const convertedBucketProjects: Project[] = bucketProjects
            .map((bp: any) => {
              // Extract project ID from multiple possible sources
              // Try: project_id, id, file_name (without extension), or gcs_path
              let projectId = bp.project_id || bp.id;
              
              // If no direct ID, try extracting from file_name
              if (!projectId && bp.file_name) {
                // Remove .zip extension and path if present
                const fileName = bp.file_name.replace(/\.zip$/, '').split('/').pop();
                // Check if it looks like a UUID (project ID format)
                if (fileName && /^[a-f0-9-]{36}$/i.test(fileName)) {
                  projectId = fileName;
                }
              }
              
              // If still no ID, try extracting from gcs_path
              if (!projectId && bp.gcs_path) {
                const pathParts = bp.gcs_path.split('/');
                const fileName = pathParts[pathParts.length - 1]?.replace(/\.zip$/, '');
                if (fileName && /^[a-f0-9-]{36}$/i.test(fileName)) {
                  projectId = fileName;
                }
              }
              
              if (!projectId) {
                console.warn('Skipping bucket project without extractable ID:', bp);
                return null;
              }
              
              return {
                id: projectId,
                name: projectId.substring(0, 8) || bp.name || projectId,
                status: 'inactive', // Bucket projects are typically archived/inactive
                preview_url: bp.download_url || null,
                preview_urls: bp.download_url ? [bp.download_url] : [],
                created_at: bp.created_at || new Date().toISOString(),
                last_active: bp.updated_at || bp.created_at || new Date().toISOString(),
                prompt: bp.prompt || `Archived project (${bp.size_mb || 0} MB)`,
                is_active: false, // Bucket projects are archived, so not active
              };
            })
            .filter((p: Project | null): p is Project => p !== null); // Remove null entries
          
          console.log('Converted bucket projects:', convertedBucketProjects.length);
          console.log('Converted project details:', convertedBucketProjects.map(p => ({ 
            id: p.id, 
            name: p.name,
            source: 'bucket'
          })));
          
          // Merge projects, avoiding duplicates based on ID
          const existingIds = new Set(projectsList.map(p => p.id));
          console.log('Existing project IDs from database:', Array.from(existingIds));
          
          const newBucketProjects = convertedBucketProjects.filter(p => {
            const isDuplicate = existingIds.has(p.id);
            if (isDuplicate) {
              console.warn(`⚠️ Filtering out duplicate bucket project: ${p.id} (already exists in database projects)`);
            }
            return !isDuplicate;
          });
          
          console.log('✅ New bucket projects after deduplication:', newBucketProjects.length);
          console.log('📋 All bucket project IDs:', convertedBucketProjects.map(p => p.id));
          console.log('📋 New bucket project IDs (after dedup):', newBucketProjects.map(p => p.id));
          
          // Log if we're missing any projects
          if (bucketProjects.length > convertedBucketProjects.length) {
            console.warn(`⚠️ WARNING: ${bucketProjects.length} projects in API response, but only ${convertedBucketProjects.length} were converted. Missing projects:`);
            bucketProjects.forEach((bp: any, idx: number) => {
              const projectId = bp.project_id || bp.id;
              const fileName = bp.file_name?.replace(/\.zip$/, '').split('/').pop();
              const gcsPath = bp.gcs_path?.split('/').pop()?.replace(/\.zip$/, '');
              if (!projectId && (!fileName || !/^[a-f0-9-]{36}$/i.test(fileName)) && (!gcsPath || !/^[a-f0-9-]{36}$/i.test(gcsPath))) {
                console.warn(`  - Index ${idx}:`, {
                  project_id: bp.project_id,
                  id: bp.id,
                  file_name: bp.file_name,
                  gcs_path: bp.gcs_path,
                });
              }
            });
          }
          
          projectsList = [...projectsList, ...newBucketProjects];
        }
        
        console.log('Total projects after merge:', projectsList.length);
        console.log('Active projects:', projectsList.filter((p: Project) => p.is_active === true).length);
        
        setProjects(projectsList);
        setLoading(false);
        return; // Success, exit retry loop
      } catch (err: any) {
        console.error(`Error loading projects (attempt ${attempt}/${retries}):`, err);
        
        // Check if it's a connection error
        if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_CONNECTION_REFUSED') || err.message?.includes('Cannot connect')) {
          if (attempt < retries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          } else {
            setError('Cannot connect to server. Please make sure the Next.js server is running and try again.');
          }
        } else {
          // Other errors, don't retry
          setError(err.message || 'Failed to load projects');
          setLoading(false);
          return;
        }
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const handleSelectProject = (project: Project) => {
    onSelectProject(project.id, project);
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
  
  // Filter projects based on selected filter
  // Handle cases where is_active might be undefined/null
  const filteredProjects = projects.filter(project => {
    // Ensure project has valid ID
    if (!project.id) {
      console.warn('Project without ID found:', project);
      return false;
    }
    
    const isActive = project.is_active === true;
    if (filter === 'active') return isActive;
    if (filter === 'inactive') return !isActive;
    return true; // 'all'
  });
  
  const activeCount = projects.filter(p => p.is_active === true).length;
  const inactiveCount = projects.filter(p => p.is_active !== true).length;
  
  // Debug logging
  useEffect(() => {
    if (isOpen && projects.length > 0) {
      console.log('=== Project Selector Debug ===');
      console.log('All projects:', projects.length);
      console.log('Filtered projects:', filteredProjects.length);
      console.log('Filter:', filter);
      console.log('Project IDs:', projects.map(p => ({ id: p.id, name: p.name, is_active: p.is_active })));
      console.log('Filtered IDs:', filteredProjects.map(p => p.id));
    }
  }, [isOpen, projects.length, filteredProjects.length, filter]);

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
            <div className="p-3 border-b border-orange-500/30 bg-black">
              <div className="flex items-center justify-between mb-2">
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
              
              {/* Filter Tabs */}
              <div className="flex space-x-1 mt-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  All ({projects.length})
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                    filter === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span className="h-1.5 w-1.5 bg-current rounded-full"></span>
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setFilter('inactive')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === 'inactive'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Inactive ({inactiveCount})
                </button>
              </div>
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
              ) : filteredProjects.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="bg-black rounded-full p-3 w-14 h-14 mx-auto mb-2 flex items-center justify-center">
                    <svg className="h-7 w-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">
                    {projects.length === 0 
                      ? 'No projects yet' 
                      : filter === 'active' 
                        ? 'No active projects' 
                        : filter === 'inactive'
                          ? 'No inactive projects'
                          : 'No projects match the filter'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {projects.length === 0 
                      ? 'Create your first project' 
                      : 'Try selecting a different filter'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-orange-500/20">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className={`w-full p-3 text-left hover:bg-black transition-colors ${
                        project.id === currentProjectId ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-l-2 border-orange-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-white truncate">
                              {project.name || project.id.substring(0, 8)}
                            </h4>
                            {project.is_active === true && (
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
                  Showing {filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
                  {filter !== 'all' && (
                    <span className="ml-1">
                      ({filter === 'active' ? `${activeCount} active` : `${inactiveCount} inactive`})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
