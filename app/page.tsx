'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ProjectListItem } from '@/lib/api-client';
import ProjectCard from '@/components/ProjectCard';
import Notification, { NotificationType } from '@/components/Notification';
import UserMenu from '@/components/UserMenu';
import Footer from '@/components/Footer';

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
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/back.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/95 via-orange-50/90 to-yellow-50/95"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
      {/* Animated Header with Aceternity UI Style */}
      <header className="sticky top-0 z-50 border-b border-orange-200/20 shadow-lg">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-orange-50/95 to-yellow-50/95 backdrop-blur-xl"></div>
        <div className="absolute inset-0 dot-pattern opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-yellow-500/5 animate-gradient"></div>
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 group relative">
                {/* Animated Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
                
                <div className="relative bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl p-2.5 shadow-lg transition-all duration-300 animate-pulse-glow">
                  <svg className="h-7 w-7 text-white transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="relative">
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent animate-gradient transition-all duration-300">
                    AI Expo Builder
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block transition-colors duration-300">Build mobile apps with AI</p>
                </div>
              </div>
            </div>
            <nav className="flex items-center space-x-3 sm:space-x-4">
              <UserMenu />
            </nav>
          </div>
        </div>
      </header>

      <div className="flex-1">
        {/* Hero Section with Interactive Elements */}
        <div className="relative bg-gradient-to-br from-orange-500/10 via-yellow-500/5 to-transparent border-b border-orange-200/30 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 grid-pattern opacity-20"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 relative">
                <span className="block">Build Mobile Apps with</span>
                <span className="block bg-gradient-to-r from-orange-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent animate-gradient relative">
                  AI Power
                  <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 blur-2xl opacity-30 -z-10"></span>
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Transform your ideas into fully functional React Native applications in minutes. 
                Just describe what you want, and we'll generate it for you.
              </p>
            </div>

            {/* Interactive Prompt Input Section */}
            <div className="max-w-3xl mx-auto">
              <div className="relative group">
                {/* Animated Border Glow */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 animate-gradient"></div>
                
                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10 border border-gray-200/50 hover:border-orange-300/50 transition-all duration-300 hover-scale">
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Create New Project
                    </h3>
                    <p className="text-gray-600">
                      Describe your mobile app idea and we'll generate it for you instantly.
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group/textarea">
                      {/* Animated Glow Background */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/30 to-yellow-500/30 rounded-xl opacity-0 group-hover/textarea:opacity-100 blur-xl transition-opacity duration-300 animate-gradient"></div>
                      
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover/textarea:opacity-100 animate-shimmer"></div>
                      
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Create a todo app with dark mode, user authentication, and push notifications..."
                        className="relative w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none bg-white/80 backdrop-blur-sm text-gray-900 placeholder-gray-400 transition-all duration-300 hover:border-orange-300 hover:bg-white"
                        rows={5}
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <p className="text-sm text-gray-500">
                        {prompt.length > 0 && (
                          <span className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200/50">
                            <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-medium text-gray-700">{prompt.length} characters</span>
                          </span>
                        )}
                      </p>
                      <button
                        type="submit"
                        disabled={!prompt.trim() || loading}
                        className="relative w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-100 overflow-hidden group/btn"
                      >
                        {/* Button Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                        
                        {loading ? (
                          <>
                            <svg className="animate-spin h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="relative z-10">Creating...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5 relative z-10 group-hover/btn:rotate-12 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="relative z-10">Generate App</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section with Interactive Elements */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Background Pattern */}
          <div className="absolute inset-0 grid-pattern opacity-10"></div>

          {/* Projects List */}
          <div className="relative mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="animate-fade-in">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  Your Projects
                </h2>
                <p className="text-gray-600">Manage and view all your generated applications</p>
              </div>
              <button
                onClick={loadProjects}
                disabled={loadingProjects}
                className="relative px-5 py-2.5 bg-white border-2 border-gray-200 rounded-xl hover:border-orange-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-yellow-50 transition-all duration-300 text-sm font-medium disabled:opacity-50 shadow-sm hover:shadow-lg flex items-center gap-2 hover:scale-105 group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {loadingProjects ? (
                  <>
                    <svg className="animate-spin h-4 w-4 relative z-10" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="relative z-10">Loading...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 relative z-10 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="relative z-10">Refresh</span>
                  </>
                )}
              </button>
            </div>

            {loadingProjects ? (
              <div className="text-center py-16">
                <div className="inline-block bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full p-4 mb-4">
                  <svg className="animate-spin h-10 w-10 text-orange-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <p className="text-gray-600 text-lg">Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 sm:p-16 text-center shadow-sm">
                <div className="inline-block bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full p-6 mb-6">
                  <svg className="h-20 w-20 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No projects yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Get started by creating your first project! Describe your app idea above and we'll generate it for you.
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
                  <span className="px-3 py-1 bg-gray-100 rounded-full">✨ AI-Powered</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full">⚡ Fast Generation</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full">📱 React Native</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
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
