'use client';

import { useState, useEffect, useRef } from 'react';
import ChatPanel from '@/components/ChatPanel';
import CodeEditor from '@/components/CodeEditor';
import PreviewFrame from '@/components/PreviewFrame';
import ProjectSelector from '@/components/ProjectSelector';
import Notification, { NotificationType } from '@/components/Notification';
import { apiClient, ProjectStatus } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { GenerationWebSocketClient } from '@/lib/websocket-client';

interface NotificationState {
  show: boolean;
  type: NotificationType;
  message: string;
  suggestion?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Generate unique message IDs to prevent duplicate keys
let messageIdCounter = 0;
const generateMessageId = (): string => {
  messageIdCounter++;
  return `${Date.now()}-${messageIdCounter}-${Math.random().toString(36).substring(2, 11)}`;
};

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
}

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'info',
    message: '',
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'checking' | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [showMetrics, setShowMetrics] = useState(false);

  // Resizable panel widths (in percentages) - improved layout
  const [leftWidth, setLeftWidth] = useState(24); // Chat panel
  const [centerWidth, setCenterWidth] = useState(51); // Code editor
  const rightWidth = 24; // Preview panel (fixed)
  const rightMargin = 1; // Right margin
  const [isResizingLeft, setIsResizingLeft] = useState(false);

  // File watching state
  const [lastFileTreeHash, setLastFileTreeHash] = useState<string>('');
  const [previewKey, setPreviewKey] = useState(0);
  const fileWatchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const generationWsRef = useRef<GenerationWebSocketClient | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{ progress: number; message: string } | null>(null);

  const handleEdit = async (promptText: string) => {
    if (!projectId) return;
    
    setIsGenerating(true);
    
    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: `✏️ ${promptText}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call edit endpoint
      const response = await apiClient.chatEdit(projectId, promptText);
      
      if (response.success) {
        // Reload file tree
        await loadFileTree(projectId);
        
        // Add success message
        const successMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: `✅ ${response.message}\n\nFiles modified:\n${response.files_modified.map(f => `• ${f}`).join('\n')}\n\n${response.changes_summary}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMessage]);
        
        showNotification('success', 'Changes applied!', response.changes_summary);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Edit error:', error);
      const errorMessage = error.message || 'Failed to apply changes';
      
      // Add error message
      const errorMsg: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `❌ Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      
      showNotification('error', errorMessage, 'Please try again with a clearer description');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async (promptText: string, templateId?: string | null) => {
    logger.buttonClick('Generate App', { prompt: promptText, templateId });
    setIsGenerating(true);
    setGenerationProgress(null);
    
    // Clean up any existing generation WebSocket
    if (generationWsRef.current) {
      generationWsRef.current.disconnect();
      generationWsRef.current = null;
    }
    
    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: promptText + (templateId ? ` [Template: ${templateId}]` : ''),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    let currentProjectId: string | null = null;
    
    try {
      logger.info('Starting app generation (fast mode)', { prompt: promptText, templateId });
      
      // Use fast-generate endpoint
      // Let backend handle user_id - no local storage used
      const response = await apiClient.fastGenerate({ 
        prompt: promptText,
        template_id: templateId || undefined,
        // user_id will be handled by backend
      });
      
      if (response.status === 'error') {
        const errorMsg = response.error || 'Generation failed';
        logger.error('Generation failed', { error: errorMsg, response }, 'API');
        throw new Error(errorMsg);
      }
      
      logger.success('App generation started', { projectId: response.project_id }, 'API');
      currentProjectId = response.project_id;
      setProjectId(currentProjectId);
      
      // Add assistant message
      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `🚀 Starting generation... Project ID: ${response.project_id.substring(0, 8)}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Get backend URL for WebSocket connection
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';
      const wsUrl = `${backendUrl}${response.websocket_url}`;

      // Connect to WebSocket for real-time updates
      generationWsRef.current = new GenerationWebSocketClient(wsUrl, {
        onOpen: () => {
          console.log('Generation WebSocket connected');
        },
        onProgress: (progress, message) => {
          console.log(`Progress: ${progress}% - ${message}`);
          setGenerationProgress({ progress, message });
          
          // Update status based on progress, but preserve existing preview_url if set
          let status: ProjectStatus['status'] = 'initializing';
          if (progress >= 5 && progress < 15) status = 'initializing';
          else if (progress >= 15 && progress < 35) status = 'generating_code';
          else if (progress >= 35 && progress < 45) status = 'installing_deps';
          else if (progress >= 45 && progress < 60) status = 'starting_server';
          else if (progress >= 60 && progress < 85) status = 'creating_tunnel';
          else if (progress >= 85) status = 'ready';
          
          // Preserve existing preview_url if already set
          setStatus(prev => ({
            id: currentProjectId || prev?.id || 'unknown',
            status,
            preview_url: prev?.preview_url || null,
            error: null,
            created_at: prev?.created_at || new Date().toISOString(),
          }));
        },
        onPreviewReady: async (previewUrl) => {
          console.log('Preview ready callback triggered with URL:', previewUrl);
          
          // Validate preview URL
          if (!previewUrl || typeof previewUrl !== 'string') {
            console.error('Invalid preview URL received:', previewUrl);
            return;
          }
          
          // Ensure URL is properly formatted
          let validUrl = previewUrl;
          try {
            // Try to create URL object to validate
            new URL(previewUrl);
          } catch (e) {
            // If URL parsing fails, try to fix it
            if (previewUrl.startsWith('//')) {
              validUrl = `https:${previewUrl}`;
            } else if (!previewUrl.startsWith('http')) {
              validUrl = `https://${previewUrl}`;
            }
            console.log('Fixed preview URL format:', validUrl);
          }
          
          console.log('Setting preview URL:', validUrl);
          setPreviewUrl(validUrl);
          
          setStatus(prev => ({
            ...prev,
            id: currentProjectId || prev?.id || 'unknown',
            status: 'ready',
            preview_url: validUrl,
            error: null,
            created_at: prev?.created_at || new Date().toISOString(),
          }));
          
          // Load file tree (with a small delay to allow backend to prepare files)
          if (currentProjectId) {
            setTimeout(async () => {
              await loadFileTree(currentProjectId, false);
            }, 2000); // Wait 2 seconds before loading file tree
          }
          
          // Add preview ready message
          const previewMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: `✅ Preview ready! Your app is now available.\n\nPreview URL: ${validUrl}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, previewMessage]);
          
          showNotification('success', 'Preview ready!', 'Your app is now available in the preview');
        },
        onComplete: async (data) => {
          console.log('Generation complete:', data);
          
          // Extract preview URL from complete message
          const previewUrlFromComplete = data?.preview_url || data?.previewUrl || data?.url;
          
          // Set preview URL if available and not already set
          setStatus(prev => {
            const finalPreviewUrl = prev?.preview_url || previewUrlFromComplete || null;
            
            if (previewUrlFromComplete && !prev?.preview_url) {
              console.log('Setting preview URL from complete message:', previewUrlFromComplete);
              setPreviewUrl(previewUrlFromComplete);
            }
            
            return {
              id: currentProjectId || prev?.id || 'unknown',
              status: 'ready',
              preview_url: finalPreviewUrl,
              error: null,
              created_at: prev?.created_at || new Date().toISOString(),
            };
          });
          
          // Load file tree (with a small delay to allow backend to prepare files)
          if (currentProjectId) {
            setTimeout(async () => {
              await loadFileTree(currentProjectId, false);
            }, 2000); // Wait 2 seconds before loading file tree
          }
          
          // Add completion message
          const completeMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: `🎉 Generation complete! Your app is ready.\n\n${data.preview_url ? `Preview URL: ${data.preview_url}` : 'Project ID: ' + currentProjectId}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, completeMessage]);
          
          showNotification('success', 'App ready!', 'Your app generation is complete');
          setIsGenerating(false);
          setGenerationProgress(null);
        },
        onError: (error) => {
          console.error('WebSocket error:', error);
          const errorMessage = error || 'Generation failed';
          
          setStatus({
            id: currentProjectId || projectId || 'unknown',
            status: 'error',
            preview_url: null,
            error: errorMessage,
            created_at: new Date().toISOString(),
          });
          
          const errorMsg: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: `❌ Error: ${errorMessage}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMsg]);
          
          showNotification('error', errorMessage, 'Please try again');
          setIsGenerating(false);
          setGenerationProgress(null);
        },
        onClose: () => {
          console.log('Generation WebSocket closed');
        },
      });

      generationWsRef.current.connect();
      
    } catch (error: any) {
      console.error('Generation error:', error);
      const errorMessage = error.message || 'Failed to generate app';
      
      // Log the error with details
      logger.error('App generation error', {
        error: errorMessage,
        statusCode: error.statusCode,
        suggestion: error.suggestion,
      }, 'API');
      
      // Provide better error messages for common issues
      let userMessage = errorMessage;
      let suggestion = error.suggestion;
      
      if (error.statusCode === 502 || errorMessage.includes('Bad Gateway') || errorMessage.includes('BAD_GATEWAY') || errorMessage.includes('NETWORK_ERROR') || errorMessage.includes('DNS_ERROR')) {
        userMessage = 'Cannot connect to backend server';
        suggestion = suggestion || 'The backend server may be down or unreachable. Please check your network connection and try again.';
      } else if (error.statusCode === 503 || errorMessage.includes('Service Unavailable') || errorMessage.includes('SERVICE_UNAVAILABLE')) {
        userMessage = 'Backend service is currently unavailable';
        suggestion = suggestion || 'The backend server may be temporarily overloaded or under maintenance. Please try again in a few moments.';
      } else if (error.statusCode === 504 || errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        userMessage = 'Request timed out';
        suggestion = suggestion || 'The operation took too long. The backend may be overloaded. Please try again.';
      }
      
      // Set error status if not already set
      if (!status || status.status !== 'error') {
        setStatus({
          id: currentProjectId || projectId || 'unknown',
          status: 'error',
          preview_url: null,
          error: userMessage,
          created_at: new Date().toISOString(),
        });
      }
      
      // Add error message with helpful details
      const errorContent = error.statusCode === 502 || errorMessage.includes('Bad Gateway') || errorMessage.includes('NETWORK_ERROR') || errorMessage.includes('DNS_ERROR')
        ? `❌ Cannot connect to backend server\n\n${userMessage}\n\n💡 ${suggestion || 'Please check if the backend server is running and accessible.'}`
        : `❌ Error: ${userMessage}${suggestion ? `\n\n💡 ${suggestion}` : ''}`;
      
      const errorMsg: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      
      showNotification('error', userMessage, suggestion || 'Please try again');
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const loadFileTree = async (projId: string, silent = false, retries = 3) => {
    if (!projId) {
      console.warn('loadFileTree called without projectId');
      return;
    }

    // Check if API is available first (only on first attempt)
    try {
      const healthController = new AbortController();
      const healthTimeout = setTimeout(() => healthController.abort(), 2000); // 2 second timeout
      
      const healthCheck = await fetch('/api/health', { 
        method: 'GET',
        signal: healthController.signal
      }).catch(() => null);
      
      clearTimeout(healthTimeout);
      
      if (!healthCheck || !healthCheck.ok) {
        if (!silent) {
          console.warn('API routes not available, skipping file tree load');
        }
        return; // Silently fail if API isn't available
      }
    } catch (e) {
      // Health check failed, but continue anyway (might be temporary)
      if (!silent) {
        console.warn('Health check failed, but continuing with file tree load');
      }
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`/api/files/${projId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const newFileTree = data.file_tree || [];
          
          // Calculate hash of file tree to detect changes
          const newHash = JSON.stringify(newFileTree);
          
          // Check if files changed
          if (lastFileTreeHash && newHash !== lastFileTreeHash && !silent) {
            // Files changed - refresh preview
            console.log('Files changed, refreshing preview...');
            setPreviewKey(prev => prev + 1);
            
            // Show notification
            showNotification('info', 'Files updated', 'Preview refreshed automatically');
          }
          
          setFileTree(newFileTree);
          setLastFileTreeHash(newHash);
          return; // Success, exit retry loop
        } else {
          // If not OK, try to get error message
          const errorData = await response.json().catch(() => ({}));
          
          // Don't log 404s as errors if silent mode
          if (response.status !== 404 || !silent) {
            console.warn(`Failed to load file tree (attempt ${attempt}/${retries}):`, response.status, errorData);
          }
          
          if (attempt < retries && response.status !== 404) {
            // Wait before retrying (exponential backoff), but don't retry 404s
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          } else {
            if (!silent && response.status !== 404) {
              console.error('Failed to load file tree after retries:', errorData);
            }
            return; // Exit on 404 or after all retries
          }
        }
      } catch (error: any) {
        // Check if it's an abort (timeout) or connection error
        const isConnectionError = error.name === 'AbortError' || 
                                  error.message?.includes('Failed to fetch') || 
                                  error.message?.includes('ERR_CONNECTION_REFUSED') ||
                                  error.message?.includes('network');
        
        if (isConnectionError) {
          if (attempt < retries) {
            if (!silent) {
              console.log(`Retrying file tree load in ${1000 * attempt}ms... (attempt ${attempt}/${retries})`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          } else {
            // Final attempt failed - only log if not silent
            if (!silent) {
              console.warn('Failed to load file tree: API routes may not be available. This is normal if the server is still starting.');
            }
            // Don't show error notification for connection errors - they're usually temporary
            return;
          }
        } else {
          // Other errors, don't retry
          if (!silent) {
            console.error('Failed to load file tree:', error);
          }
          return; // Exit on non-connection errors
        }
      }
    }
  };

  // Start file watching when project is active (WebSocket + Polling fallback)
  useEffect(() => {
    if (projectId && status?.status === 'ready') {
      // Initial load
      loadFileTree(projectId, true);
      
      // Try WebSocket first for real-time updates
      const wsUrl = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace('http', 'ws')}/ws/watch/${projectId}`;
      
      try {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected for file watching');
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'file_change') {
              console.log('Files changed (WebSocket):', data.files);
              
              // Reload file tree
              loadFileTree(projectId);
              
              // Refresh preview
              setPreviewKey(prev => prev + 1);
              
              // Show notification
              showNotification('info', 'Code updated', `${data.files.length} file(s) changed - Preview refreshing`);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
          console.log('WebSocket closed, falling back to polling');
        };
        
        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
      }
      
      // Fallback: Start polling for file changes every 5 seconds
      fileWatchIntervalRef.current = setInterval(() => {
        loadFileTree(projectId);
      }, 5000);
      
      console.log('Started file watching for project:', projectId);
    } else {
      // Stop watching when project is not active
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (fileWatchIntervalRef.current) {
        clearInterval(fileWatchIntervalRef.current);
        fileWatchIntervalRef.current = null;
        console.log('Stopped file watching');
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (fileWatchIntervalRef.current) {
        clearInterval(fileWatchIntervalRef.current);
      }
    };
  }, [projectId, status?.status]);

  // Cleanup generation WebSocket on unmount
  useEffect(() => {
    return () => {
      if (generationWsRef.current) {
        generationWsRef.current.disconnect();
        generationWsRef.current = null;
      }
    };
  }, []);

  // Poll for preview URL if project is ready but URL is missing
  useEffect(() => {
    if (projectId && status?.status === 'ready' && !previewUrl && !isGenerating) {
      console.log('Project is ready but preview URL is missing, polling for preview URL...');
      
      let pollAttempts = 0;
      const maxAttempts = 10; // Poll for up to 50 seconds (10 * 5s)
      const pollInterval = 5000; // 5 seconds
      let timeoutId: NodeJS.Timeout | null = null;
      
      const pollForPreviewUrl = async () => {
        if (pollAttempts >= maxAttempts) {
          console.log('Stopped polling for preview URL after max attempts. Project is ready but preview URL is not available.');
          showNotification('warning', 'Preview URL not available', 'The project is ready but the preview URL is not available. The server may still be starting up.');
          return;
        }
        
        try {
          const projectStatus = await apiClient.getStatus(projectId);
          console.log('Polled project status:', {
            status: projectStatus.status,
            hasPreviewUrl: !!projectStatus.preview_url,
            previewUrl: projectStatus.preview_url,
            attempt: pollAttempts + 1,
          });
          
          if (projectStatus.preview_url) {
            console.log('Preview URL found via polling:', projectStatus.preview_url);
            setPreviewUrl(projectStatus.preview_url);
            setStatus(prev => prev ? {
              ...prev,
              preview_url: projectStatus.preview_url,
            } : projectStatus);
            return; // Stop polling
          }
          
          // If status changed from 'ready' to something else, stop polling
          if (projectStatus.status !== 'ready') {
            console.log('Project status changed from ready to:', projectStatus.status);
            setStatus(projectStatus);
            return; // Stop polling, status changed
          }
          
          pollAttempts++;
          if (pollAttempts < maxAttempts) {
            timeoutId = setTimeout(pollForPreviewUrl, pollInterval);
          } else {
            console.log('Max polling attempts reached. Preview URL still not available.');
          }
        } catch (error) {
          console.error('Error polling for preview URL:', error);
          pollAttempts++;
          if (pollAttempts < maxAttempts) {
            timeoutId = setTimeout(pollForPreviewUrl, pollInterval);
          }
        }
      };
      
      // Start polling after a short delay
      timeoutId = setTimeout(pollForPreviewUrl, pollInterval);
      
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [projectId, status?.status, previewUrl, isGenerating]);

  // Handle manual refresh from preview frame
  useEffect(() => {
    const handleForceRefresh = () => {
      console.log('Manual refresh triggered');
      setPreviewKey(prev => prev + 1);
    };

    window.addEventListener('forcePreviewRefresh', handleForceRefresh);
    
    return () => {
      window.removeEventListener('forcePreviewRefresh', handleForceRefresh);
    };
  }, []);

  const handleFileSelect = (path: string) => {
    console.log('File selected:', path);
  };

  const handleSelectProject = async (selectedProjectId: string, projectData?: any) => {
    setProjectId(selectedProjectId);
    setIsGenerating(true);
    
    try {
      // Check if project is already active
      const isActive = projectData?.is_active === true;
      const existingPreviewUrl = projectData?.preview_url || projectData?.preview_urls?.[0];
      
      if (isActive) {
        // Project is already active, get status and show preview immediately
        console.log('Project is already active, fetching status...', {
          projectId: selectedProjectId,
          existingPreviewUrl,
          isActive,
        });
        
        const loadingMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: `Loading active project ${selectedProjectId.substring(0, 8)}...`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, loadingMessage]);
        
        showNotification('info', 'Loading project', 'Fetching project status...');
        
        // Get current project status (this should have the ngrok URL)
        const projectStatus = await apiClient.getStatus(selectedProjectId);
        console.log('Active project status:', projectStatus);
        
        // Use preview URL from status (ngrok URL) or fallback to existing one
        const previewUrl = projectStatus.preview_url || existingPreviewUrl;
        
        if (!previewUrl) {
          console.warn('Active project but no preview URL found. Status:', projectStatus);
        }
        
        setStatus({
          id: projectStatus.id || selectedProjectId,
          status: projectStatus.status || 'ready',
          preview_url: previewUrl,
          error: projectStatus.error,
          created_at: projectStatus.created_at || new Date().toISOString(),
        });
        
        if (previewUrl) {
          console.log('Setting preview URL (ngrok) for active project:', previewUrl);
          setPreviewUrl(previewUrl);
        } else {
          console.warn('No preview URL available for active project, will show "Preview URL Not Available" message');
        }
        
        // Load file tree
        await loadFileTree(selectedProjectId);
        
        // Add success message to chat
        const message: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: `✅ Active project loaded: ${selectedProjectId.substring(0, 8)}${previewUrl ? `\n🔗 Preview: ${previewUrl}` : '\n⚠️ Preview URL not available yet'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, message]);
        
        if (previewUrl) {
          showNotification('success', 'Project loaded!', 'Preview is now available');
        } else {
          showNotification('warning', 'Project loaded', 'Preview URL not available yet');
        }
        return; // Exit early, no need to activate
      }
      
      // Project is not active, need to activate it
      console.log('Project is inactive, activating...', selectedProjectId);
      
      // Add message about activation
      const activatingMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Loading project ${selectedProjectId.substring(0, 8)}...\n⏳ Starting Expo server (this may take up to 90 seconds)\n⏳ Creating preview tunnel`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, activatingMessage]);
      
      showNotification('info', 'Loading project', 'Starting Expo server... Please wait');
      
      // Activate the project (this will start server and create tunnel)
      // This can take up to 90 seconds for server start + 30 seconds for tunnel
      let activationResult: any = null;
      try {
        activationResult = await apiClient.activateProject(selectedProjectId);
        console.log('Activation result:', activationResult);
        
        // If activation returned a preview URL immediately, use it
        if (activationResult.preview_url) {
          console.log('Preview URL from activation:', activationResult.preview_url);
          setPreviewUrl(activationResult.preview_url);
          setStatus({
            id: selectedProjectId,
            status: 'ready',
            preview_url: activationResult.preview_url,
            error: null,
            created_at: new Date().toISOString(),
          });
          
          // If we got the preview URL, we're done - no need to poll
          await loadFileTree(selectedProjectId);
          const message: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: `✅ Project activated: ${selectedProjectId.substring(0, 8)}\n🔗 Preview: ${activationResult.preview_url}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, message]);
          showNotification('success', 'Project ready!', 'Your project is now running');
          return; // Exit early, we have everything we need
        }
      } catch (error: any) {
        // If activation fails, show specific error
        if (error.message.includes('timed out') || error.message.includes('timeout')) {
          throw new Error('Server start timed out. The project may have issues. Try creating a new project.');
        }
        throw error;
      }
      
      // Check current status before polling
      let projectStatus = await apiClient.getStatus(selectedProjectId);
      console.log('Status after activation:', projectStatus);
      
      // If already ready, use it directly
      if (projectStatus.status === 'ready') {
        console.log('Project is already ready after activation');
        setStatus(projectStatus);
        if (projectStatus.preview_url) {
          console.log('Preview URL from status check:', projectStatus.preview_url);
          setPreviewUrl(projectStatus.preview_url);
        }
      } else {
        // Only poll if project is in a transitional state
        console.log('Project is in transitional state, polling until ready...', projectStatus.status);
        projectStatus = await apiClient.pollStatus(selectedProjectId, {
          intervalMs: 3000, // Poll every 3 seconds
          maxAttempts: 40, // Max 2 minutes (40 * 3s = 120s)
          onStatusUpdate: (status) => {
            setStatus(status);
            
            // Update preview URL if available
            if (status.preview_url) {
              console.log('Preview URL from status update:', status.preview_url);
              setPreviewUrl(status.preview_url);
            }
            
            // Update message based on status
            if (status.status === 'starting_server') {
              showNotification('info', 'Starting server', 'Expo server is starting...');
            } else if (status.status === 'creating_tunnel') {
              showNotification('info', 'Creating tunnel', 'Setting up preview URL...');
            }
          },
        });
        
        setStatus(projectStatus);
        
        if (projectStatus.preview_url) {
          console.log('Final preview URL:', projectStatus.preview_url);
          setPreviewUrl(projectStatus.preview_url);
        }
      }
      
      // Load file tree
      await loadFileTree(selectedProjectId);
      
      // Add success message to chat
      const message: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `✅ Project loaded: ${selectedProjectId.substring(0, 8)}${projectStatus.preview_url ? `\n🔗 Preview: ${projectStatus.preview_url}` : '\n⚠️ Preview URL not available yet'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, message]);
      
      if (projectStatus.preview_url) {
        showNotification('success', 'Project ready!', 'Your project is now running');
      } else {
        showNotification('warning', 'Project loaded', 'Preview URL not available yet. It may still be generating.');
      }
    } catch (error: any) {
      console.error('Error loading project:', error);
      
      // Provide better error messages
      let errorMessage = error.message || 'Failed to load project';
      let suggestion = '';
      
      if (errorMessage.includes('Status polling timed out')) {
        errorMessage = 'Project activation is taking longer than expected';
        suggestion = 'The project may still be starting up. Try waiting a moment and clicking "Check Again" in the preview panel.';
      } else if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        errorMessage = 'Request timed out';
        suggestion = 'The server may be overloaded. Please try again in a moment.';
      }
      
      // Add error message
      const errorMsg: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `❌ Failed to load project: ${errorMessage}${suggestion ? `\n💡 ${suggestion}` : ''}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      
      showNotification('error', 'Failed to load project', suggestion || errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!projectId) return;

    logger.buttonClick('Download Project', { projectId });
    try {
      logger.info('Downloading project', { projectId });
      const blob = await apiClient.download(projectId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expo-app-${projectId.substring(0, 8)}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification('success', 'Download started', 'Your project is being downloaded');
    } catch (error: any) {
      console.error('Download error:', error);
      showNotification('error', 'Download failed', error.message);
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

  const currentStatus: 'idle' | 'generating' | 'ready' | 'error' = 
    status?.status === 'ready' ? 'ready' :
    status?.status === 'error' ? 'error' :
    isGenerating ? 'generating' : 'idle';

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    checkHealth();
    // Check health every 30 seconds
    const healthInterval = setInterval(checkHealth, 30000);
    return () => clearInterval(healthInterval);
  }, []);

  // Load metrics periodically
  useEffect(() => {
    if (showMetrics) {
      loadMetrics();
      const metricsInterval = setInterval(loadMetrics, 10000);
      return () => clearInterval(metricsInterval);
    }
  }, [showMetrics]);

  const checkHealth = async () => {
    try {
      setHealthStatus('checking');
      const health = await apiClient.getHealth();
      // Accept both 'healthy' and 'ok' as healthy status
      const isHealthy = health.status === 'healthy' || health.status === 'ok';
      setHealthStatus(isHealthy ? 'healthy' : 'unhealthy');
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus('unhealthy');
    }
  };

  const loadMetrics = async () => {
    try {
      const metricsData = await apiClient.getMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setTemplates(data.templates || []);
        } else {
          console.warn('Templates endpoint returned non-JSON response');
          setTemplates([]);
        }
      } else {
        console.warn(`Templates endpoint returned status ${response.status}`);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!projectId) {
      showNotification('error', 'No project loaded', 'Please create or load a project first');
      return;
    }

    try {
      const response = await fetch('/api/apply-template', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          project_id: projectId,
          template_id: templateId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply template');
      }

      const data = await response.json();
      
      // Reload file tree
      await loadFileTree(projectId);
      
      // Refresh preview
      setPreviewKey(prev => prev + 1);
      
      // Add success message
      const successMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `✅ Template Applied!\n\n${data.message}\n\nFiles updated: ${data.files_updated.length}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, successMessage]);
      
      showNotification('success', 'Template applied!', `${data.files_updated.length} files updated`);
      setShowTemplateModal(false);
      
    } catch (error: any) {
      console.error('Template application error:', error);
      showNotification('error', 'Failed to apply template', error.message);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="bg-black rounded-lg p-2">
                <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Expo Builder</h1>
                <p className="text-sm text-black/70">Build mobile apps with AI</p>
              </div>
            </div>
            <ProjectSelector
              onSelectProject={handleSelectProject}
              currentProjectId={projectId}
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Health Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50">
              <div className={`w-2 h-2 rounded-full ${
                healthStatus === 'healthy' ? 'bg-green-400 animate-pulse' :
                healthStatus === 'unhealthy' ? 'bg-red-400' :
                healthStatus === 'checking' ? 'bg-yellow-400 animate-pulse' :
                'bg-gray-400'
              }`} />
              <span className="text-xs text-white/80">
                {healthStatus === 'healthy' ? 'Online' :
                 healthStatus === 'unhealthy' ? 'Offline' :
                 healthStatus === 'checking' ? 'Checking...' :
                 'Unknown'}
              </span>
            </div>
            
            {/* Metrics Button */}
            <button
              onClick={() => {
                setShowMetrics(!showMetrics);
                if (!showMetrics) loadMetrics();
              }}
              className="flex items-center space-x-2 bg-black hover:bg-gray-900 text-orange-400 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Metrics</span>
            </button>
            
            {projectId && (
              <>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center space-x-2 bg-black hover:bg-gray-900 text-orange-400 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <span>🎨</span>
                  <span>Browse Templates</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-2 bg-black hover:bg-gray-900 text-orange-400 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download Project</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3-Panel Resizable Layout with improved spacing */}
      <div className="flex-1 flex overflow-hidden border-t-2 border-orange-500 relative">
        {/* Left Panel - Chat */}
        <div 
          className="overflow-hidden shadow-lg relative"
          style={{ width: `${leftWidth}%` }}
        >
          <ChatPanel
            onSubmit={handleGenerate}
            onEdit={handleEdit}
            isLoading={isGenerating}
            messages={messages}
            projectId={projectId}
            hasActiveProject={!!projectId && status?.status === 'ready'}
          />
        </div>

        {/* Vertical Resizer between Chat and Editor */}
        <div
          className={`w-1 bg-orange-500/20 hover:bg-orange-500/60 cursor-col-resize transition-colors relative group ${isResizingLeft ? 'bg-orange-500' : ''}`}
          onMouseDown={(e) => {
            setIsResizingLeft(true);
            const startX = e.clientX;
            const startLeftWidth = leftWidth;
            const startCenterWidth = centerWidth;
            
            const handleMouseMove = (e: MouseEvent) => {
              const containerWidth = window.innerWidth;
              const deltaX = e.clientX - startX;
              const deltaPercent = (deltaX / containerWidth) * 100;
              
              const newLeftWidth = Math.max(15, Math.min(40, startLeftWidth + deltaPercent));
              const newCenterWidth = Math.max(30, Math.min(60, startCenterWidth - deltaPercent));
              
              setLeftWidth(newLeftWidth);
              setCenterWidth(newCenterWidth);
            };
            
            const handleMouseUp = () => {
              setIsResizingLeft(false);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          {/* Resize indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col gap-1 bg-orange-500 rounded px-0.5 py-2">
              <div className="w-0.5 h-3 bg-white rounded"></div>
              <div className="w-0.5 h-3 bg-white rounded"></div>
              <div className="w-0.5 h-3 bg-white rounded"></div>
            </div>
          </div>
        </div>

        {/* Center Panel - Code Editor */}
        <div 
          className="overflow-hidden border-r border-orange-500/30 shadow-lg"
          style={{ width: `${centerWidth}%` }}
        >
          <CodeEditor
            projectId={projectId}
            fileTree={fileTree}
            onFileSelect={handleFileSelect}
            onFileUpdate={(path, content) => {
              console.log('File updated:', path);
              // Trigger preview refresh
              setPreviewKey(prev => prev + 1);
              // Reload file tree to update content
              if (projectId) {
                loadFileTree(projectId);
              }
              showNotification('success', 'File saved', 'Preview refreshing...');
            }}
            onFileChange={() => {
              console.log('File structure changed');
              // Trigger preview refresh
              setPreviewKey(prev => prev + 1);
              // Reload file tree
              if (projectId) {
                loadFileTree(projectId);
              }
              showNotification('info', 'Files updated', 'Preview refreshing...');
            }}
          />
        </div>

        {/* Right Panel - Preview (24%) with 1% right margin */}
        <div 
          className="overflow-hidden shadow-lg"
          style={{ width: `${rightWidth}%`, marginRight: `${rightMargin}%` }}
        >
          <PreviewFrame
            url={previewUrl}
            status={currentStatus}
            error={status?.error || undefined}
            onRetry={async () => {
              if (projectId) {
                console.log('Retrying to get preview URL for project:', projectId);
                try {
                  // Check project status to get preview URL
                  const projectStatus = await apiClient.getStatus(projectId);
                  console.log('Project status on retry:', {
                    status: projectStatus.status,
                    hasPreviewUrl: !!projectStatus.preview_url,
                    previewUrl: projectStatus.preview_url,
                  });
                  
                  if (projectStatus.preview_url) {
                    console.log('Preview URL found on retry:', projectStatus.preview_url);
                    setPreviewUrl(projectStatus.preview_url);
                    setStatus(prev => prev ? {
                      ...prev,
                      preview_url: projectStatus.preview_url,
                    } : projectStatus);
                    return; // Success, exit early
                  }
                  
                  // Only activate if project is actually inactive or in error state
                  // Don't activate if it's already 'ready' - just means preview URL isn't available yet
                  if (projectStatus.status === 'inactive' || projectStatus.status === 'error') {
                    console.log('Project is inactive or in error state, attempting to activate...');
                    try {
                      const activationResult = await apiClient.activateProject(projectId);
                      console.log('Activation result:', activationResult);
                      
                      if (activationResult.preview_url) {
                        setPreviewUrl(activationResult.preview_url);
                        setStatus(prev => prev ? {
                          ...prev,
                          preview_url: activationResult.preview_url,
                          status: 'ready',
                        } : {
                          id: projectId,
                          status: 'ready',
                          preview_url: activationResult.preview_url,
                          error: null,
                          created_at: new Date().toISOString(),
                        });
                      } else {
                        // Activation started but no preview URL yet, will be polled
                        console.log('Activation started, preview URL will be available soon');
                        setStatus(prev => prev ? {
                          ...prev,
                          status: 'starting_server',
                        } : {
                          id: projectId,
                          status: 'starting_server',
                          preview_url: null,
                          error: null,
                          created_at: new Date().toISOString(),
                        });
                      }
                    } catch (activateError) {
                      console.error('Failed to activate project:', activateError);
                      showNotification('error', 'Activation failed', activateError instanceof Error ? activateError.message : 'Unknown error');
                    }
                  } else if (projectStatus.status === 'ready') {
                    // Project is ready but no preview URL - this is a backend issue
                    console.warn('Project is ready but preview URL is not available. This may indicate the server is still starting or the tunnel is being created.');
                    showNotification('warning', 'Preview URL not ready', 'The project is ready but the preview URL is still being generated. Please wait a moment and try again.');
                  } else {
                    // Project is in a transitional state (starting_server, creating_tunnel, etc.)
                    console.log('Project is in transitional state:', projectStatus.status);
                    setStatus(projectStatus);
                    showNotification('info', 'Project starting', `Status: ${projectStatus.status}. Preview URL will be available soon.`);
                  }
                } catch (error) {
                  console.error('Failed to get project status on retry:', error);
                  showNotification('error', 'Status check failed', error instanceof Error ? error.message : 'Unknown error');
                }
              }
            }}
            onDownload={handleDownload}
            projectId={projectId || undefined}
            refreshKey={previewKey}
          />
        </div>
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <Notification
          type={notification.type}
          message={notification.message}
          suggestion={notification.suggestion}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      {/* Metrics Panel */}
      {showMetrics && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" 
            onClick={() => setShowMetrics(false)}
          />
          <div className="fixed right-4 top-20 bottom-4 w-96 z-50 bg-gray-900 border-2 border-orange-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-yellow-500/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  System Metrics
                </h3>
                <button
                  onClick={() => setShowMetrics(false)}
                  className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {metrics ? (
                <>
                  {/* System Resources */}
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-orange-500/20">
                    <h4 className="text-sm font-semibold text-orange-400 mb-3">System Resources</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>CPU Usage</span>
                          <span>{metrics.cpu_percent?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(metrics.cpu_percent || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Memory Usage</span>
                          <span>{metrics.memory_percent?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(metrics.memory_percent || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Disk Usage</span>
                          <span>{metrics.disk_percent?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(metrics.disk_percent || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Statistics */}
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-orange-500/20">
                    <h4 className="text-sm font-semibold text-orange-400 mb-3">Project Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Active Projects</span>
                        <span className="text-lg font-bold text-orange-400">{metrics.active_projects || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Total Created</span>
                        <span className="text-lg font-bold text-yellow-400">{metrics.total_projects_created || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Avg Generation Time</span>
                        <span className="text-lg font-bold text-green-400">
                          {metrics.average_generation_time ? `${(metrics.average_generation_time / 60).toFixed(1)} min` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-400">Loading metrics...</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Template Browser Modal */}
      {showTemplateModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50" 
            onClick={() => setShowTemplateModal(false)}
          />
          <div className="fixed inset-4 md:inset-8 lg:inset-16 z-50 bg-gray-900 border-2 border-orange-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-yellow-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span>🎨</span>
                    Browse & Apply Templates
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Select a color scheme to instantly update your app</p>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div 
                    key={template.id}
                    className="group relative rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${template.colors.background} 0%, ${template.colors.surface} 100%)`,
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: template.colors.primary + '50'
                    }}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: template.colors.primary }}
                        >
                          <div 
                            className="w-8 h-8 rounded-lg shadow-inner"
                            style={{ backgroundColor: template.colors.secondary }}
                          />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold" style={{ color: template.colors.text_primary }}>
                            {template.name}
                          </h4>
                          <p className="text-xs" style={{ color: template.colors.text_secondary }}>
                            {template.id}
                          </p>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm mb-4" style={{ color: template.colors.text_secondary }}>
                        {template.description}
                      </p>
                      
                      {/* Color Palette */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold mb-2" style={{ color: template.colors.text_secondary }}>
                          Color Palette
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md"
                              style={{ backgroundColor: template.colors.primary }}
                              title="Primary"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Primary</p>
                          </div>
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md"
                              style={{ backgroundColor: template.colors.secondary }}
                              title="Secondary"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Second</p>
                          </div>
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md"
                              style={{ backgroundColor: template.colors.accent }}
                              title="Accent"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Accent</p>
                          </div>
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md border"
                              style={{ 
                                backgroundColor: template.colors.surface,
                                borderColor: template.colors.border
                              }}
                              title="Surface"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Surface</p>
                          </div>
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md"
                              style={{ backgroundColor: template.colors.text_primary }}
                              title="Text"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Text</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* UI Preview */}
                      <div className="mb-4 rounded-lg overflow-hidden border-2" style={{ borderColor: template.colors.border }}>
                        <iframe
                          src={`/api/template-preview/${template.id}`}
                          className="w-full h-64 border-0"
                          title={`${template.name} Preview`}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                      </div>
                      
                      {/* Apply Button */}
                      <button
                        onClick={() => handleApplyTemplate(template.id)}
                        className="w-full py-3 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        style={{ 
                          backgroundColor: template.colors.primary,
                          color: template.colors.surface
                        }}
                      >
                        Apply {template.name}
                      </button>
                    </div>
                    
                    {/* Hover Effect Overlay */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                      style={{ backgroundColor: template.colors.primary }}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-orange-500/30 bg-black/50">
              <p className="text-xs text-center text-gray-500">
                💡 Templates instantly update all colors across your entire app
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
