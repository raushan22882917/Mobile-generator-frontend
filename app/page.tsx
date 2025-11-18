'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ProjectListItem } from '@/lib/api-client';
import ProjectCard from '@/components/ProjectCard';
import Notification, { NotificationType } from '@/components/Notification';
import UserMenu from '@/components/UserMenu';

interface NotificationState {
  show: boolean;
  type: NotificationType;
  message: string;
  suggestion?: string;
}

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'info',
    message: '',
  });

  // Load all projects on mount
  useEffect(() => {
    loadProjects();
    // Refresh projects every 30 seconds
    const interval = setInterval(loadProjects, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const allProjects = await apiClient.getAllProjects();
      
      // Fetch status for each project to get preview URLs and tunnel URLs
      const projectsWithStatus = await Promise.all(
        allProjects.map(async (project) => {
          try {
            const status = await apiClient.getStatus(project.id);
            return {
              ...project,
              status: status.status,
              preview_url: status.preview_url || project.preview_url,
              latest_tunnel_url: status.latest_tunnel_url || status.preview_url || project.preview_url,
              tunnel_urls: status.tunnel_urls || project.tunnel_urls,
              active_tunnel_count: status.active_tunnel_count || 0,
            };
          } catch (error) {
            // If status fetch fails, use original project data
            console.warn(`Failed to get status for project ${project.id}:`, error);
            return project;
          }
        })
      );
      
      // Sort by created_at descending (newest first)
      const sorted = projectsWithStatus.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setProjects(sorted);
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      showNotification('error', 'Failed to load projects', error.message);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      // Generate new project using POST /generate
      const response = await apiClient.generate({ 
        prompt: prompt.trim(),
      });

      // Navigate to project detail page with the prompt
      // The detail page will handle the status polling and display progress
      router.push(`/project/${response.project_id}?prompt=${encodeURIComponent(prompt.trim())}`);
    } catch (error: any) {
      console.error('Generation error:', error);
      showNotification('error', 'Failed to create project', error.message || 'Please try again');
      setLoading(false);
    }
  };

  const showNotification = (type: NotificationType, message: string, suggestion?: string) => {
    setNotification({
      show: true,
      type,
      message,
      suggestion,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
              >
                <div className="bg-white rounded-lg p-2">
                  <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">AI Expo Builder</h1>
                  <p className="text-sm text-black/70">Build mobile apps with AI</p>
                </div>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/profile')}
                className="hidden md:flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Prompt Input Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border-2 border-orange-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Project</h2>
          <p className="text-gray-600 mb-6">
            Describe your mobile app idea and we'll generate it for you instantly.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Create a todo app with dark mode, user authentication, and push notifications..."
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                rows={4}
                disabled={loading}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {prompt.length > 0 && `${prompt.length} characters`}
              </p>
              <button
                type="submit"
                disabled={!prompt.trim() || loading}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate App
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Projects List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">All Projects</h2>
            <button
              onClick={loadProjects}
              disabled={loadingProjects}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loadingProjects ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </span>
              )}
            </button>
          </div>

          {loadingProjects ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-8 w-8 text-orange-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-4">Create your first project by entering a prompt above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification.show && (
        <Notification
          type={notification.type}
          message={notification.message}
          suggestion={notification.suggestion}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}
    </div>
  );
}
