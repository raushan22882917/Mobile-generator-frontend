import axios, { AxiosInstance, AxiosError } from 'axios';
import { getFirebaseIdToken } from './auth-api';
import type {
  FastGenerateRequest,
  FastGenerateResponse,
  StreamingGenerateRequest,
  StreamingGenerateResponse,
  ProjectStatusResponse,
  BuildStep,
  GenerateRequest,
  GenerateResponse,
  AnalyzePromptRequest,
  AnalyzePromptResponse,
  ChatEditRequest,
  ChatEditResponse,
  FileUpdate,
  FileCreateRequest,
  FileContentRequest,
  FileRenameRequest,
  GenerateScreenRequest,
  ImageGenerateRequest,
  ImageGenerateResponse,
  SupabaseConfigRequest,
  SupabaseConfigResponse,
  SupabaseConfigStatusResponse,
  SupabaseTestResponse,
  ApplyTemplateRequest,
  BuildRequest,
  BuildResponse,
  BuildStatusResponse,
  ManualActivateRequest,
  HealthResponse,
  MetricsResponse,
  ProjectListItem,
  TunnelURL,
  ErrorResponse,
  EditorFileTree,
} from './api-types';

// Re-export types for convenience
export type {
  FastGenerateRequest,
  FastGenerateResponse,
  StreamingGenerateRequest,
  StreamingGenerateResponse,
  ProjectStatusResponse,
  BuildStep,
  GenerateRequest,
  GenerateResponse,
  AnalyzePromptRequest,
  AnalyzePromptResponse,
  ChatEditRequest,
  ChatEditResponse,
  FileUpdate,
  FileCreateRequest,
  FileContentRequest,
  FileRenameRequest,
  GenerateScreenRequest,
  ImageGenerateRequest,
  ImageGenerateResponse,
  SupabaseConfigRequest,
  SupabaseConfigResponse,
  SupabaseConfigStatusResponse,
  SupabaseTestResponse,
  ApplyTemplateRequest,
  BuildRequest,
  BuildResponse,
  BuildStatusResponse,
  ManualActivateRequest,
  HealthResponse,
  MetricsResponse,
  ProjectListItem,
  TunnelURL,
  ErrorResponse,
  EditorFileTree,
};

// Retry Configuration
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// API Client Class
export class APIClient {
  private client: AxiosInstance;
  private baseURL: string;
  private retryConfig: RetryConfig;

  constructor(baseURL?: string, retryConfig?: Partial<RetryConfig>) {
    // Use local API routes to avoid CORS issues
    // The Next.js API routes will proxy requests to the backend
    this.baseURL = baseURL || '/api';
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000, // 5 minutes for long-running operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getFirebaseIdToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Track failed auth attempts to avoid infinite loops
    let globalAuthFailureCount = 0;
    const MAX_AUTH_FAILURES = 5; // Allow more failures before logging out

    // Add response interceptor to handle 401 errors
    this.client.interceptors.response.use(
      (response) => {
        // Reset failure count on successful response
        globalAuthFailureCount = 0;
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        if (error.response?.status === 401) {
          // Don't retry if this is already a retry
          if (originalRequest._retry) {
            globalAuthFailureCount++;
            
            // Only logout after multiple consecutive failures across all requests
            if (globalAuthFailureCount >= MAX_AUTH_FAILURES) {
              console.log(`Multiple auth failures (${globalAuthFailureCount}), logging out`);
              
              // Sign out from Firebase
              try {
                const { auth } = await import('@/lib/firebase');
                const { signOut } = await import('firebase/auth');
                if (auth && auth.currentUser) {
                  await signOut(auth);
                }
              } catch (error) {
                console.error('Error signing out from Firebase:', error);
              }
              
              // Only redirect if we're not already on the login page
              if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
            }
            return Promise.reject(error);
          }
          
          // Mark as retry
          originalRequest._retry = true;
          
          // On 401, don't try to validate - just retry the request once
          // The backend might have extended the token or it might be a temporary issue
          // If it fails again, the failure counter will handle logout
          const token = await getFirebaseIdToken();
          if (token) {
            // Wait a brief moment before retry (in case of race condition)
            await new Promise(resolve => setTimeout(resolve, 100));
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.client(originalRequest);
          }
        } else {
          // Non-401 error - reset failure count
          globalAuthFailureCount = 0;
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fast generate - returns immediately, processes in background
   * Use WebSocket for real-time updates
   * Endpoint: POST /api/v1/fast-generate
   */
  async fastGenerate(request: FastGenerateRequest): Promise<FastGenerateResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<FastGenerateResponse>('/v1/fast-generate', {
        prompt: request.prompt,
        user_id: request.user_id ?? 'anonymous',
        template_id: request.template_id ?? null,
      });
      return response.data;
    });
  }

  /**
   * Initiate streaming generation
   * Endpoint: POST /api/v1/generate-stream
   */
  async initiateStreamingGeneration(request: StreamingGenerateRequest): Promise<StreamingGenerateResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<StreamingGenerateResponse>('/v1/generate-stream', {
        prompt: request.prompt,
        user_id: request.user_id ?? 'anonymous',
        template_id: request.template_id ?? null,
        fast_mode: request.fast_mode ?? false,
      });
      return response.data;
    });
  }

  /**
   * Get stream status
   * Endpoint: GET /api/v1/stream-status/{project_id}
   */
  async getStreamStatus(projectId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/v1/stream-status/${projectId}`);
      return response.data;
    });
  }

  /**
   * Get the current status of a project
   * Endpoint: GET /status/{project_id}
   */
  async getStatus(projectId: string): Promise<ProjectStatusResponse> {
    return this.withRetry(async () => {
      const response = await this.client.get<ProjectStatusResponse>(`/status/${projectId}`);
      return response.data;
    });
  }

  /**
   * Get quick status (ultra-fast status check)
   * Endpoint: GET /quick-status/{project_id}
   */
  async getQuickStatus(projectId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/quick-status/${projectId}`);
      return response.data;
    });
  }

  /**
   * Generate a new Expo application
   * Endpoint: POST /generate
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<GenerateResponse>('/generate', {
        prompt: request.prompt,
        user_id: request.user_id ?? 'anonymous',
        template_id: request.template_id ?? null,
      });
      return response.data;
    });
  }

  /**
   * Activate an inactive project (start server and create tunnel)
   */
  async activateProject(projectId: string): Promise<{ project_id: string; status: string; preview_url: string | null; message: string }> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/projects/${projectId}/activate`);
      return response.data;
    });
  }

  /**
   * Download a project as a ZIP file
   */
  async download(projectId: string): Promise<Blob> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/download/${projectId}`, {
        responseType: 'blob',
      });
      return response.data;
    });
  }

  /**
   * AI-powered file editing through chat
   * Endpoint: POST /chat/edit
   */
  async chatEdit(request: ChatEditRequest): Promise<ChatEditResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<ChatEditResponse>('/chat/edit', {
        project_id: request.project_id,
        prompt: request.prompt,
      });
      return response.data;
    });
  }


  /**
   * Execute a function with automatic retry logic
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = this.handleError(error);
        
        // Check if we should retry
        const shouldRetry = this.shouldRetry(error, attempt);
        
        if (!shouldRetry || attempt === this.retryConfig.maxAttempts) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.retryConfig.delayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        await this.sleep(delay);
      }
    }
    
    throw lastError || new Error('Retry failed');
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxAttempts) {
      return false;
    }
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Retry on network errors
      if (!axiosError.response) {
        return true;
      }
      
      // Retry on specific status codes
      const statusCode = axiosError.response.status;
      return this.retryConfig.retryableStatusCodes.includes(statusCode);
    }
    
    return false;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }



  /**
   * Handle and format errors from the API
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        const errorMessage = errorData.message || axiosError.message;
        const suggestion = errorData.suggestion || '';
        
        const formattedError = new Error(errorMessage);
        (formattedError as any).suggestion = suggestion;
        (formattedError as any).errorType = errorData.error;
        (formattedError as any).statusCode = axiosError.response.status;
        
        return formattedError;
      }
      
      // Network or timeout errors
      if (axiosError.code === 'ECONNREFUSED') {
        const error = new Error('Cannot connect to the backend server');
        (error as any).suggestion = 'Make sure the backend server is running';
        return error;
      }
      
      if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
        const error = new Error('Request timed out');
        (error as any).suggestion = 'The operation took too long. Please try again';
        return error;
      }
    }
    
    // Generic error
    return error instanceof Error ? error : new Error('An unexpected error occurred');
  }

  /**
   * Analyze a prompt and return suggested screens and images
   * Endpoint: POST /analyze-prompt
   */
  async analyzePrompt(request: AnalyzePromptRequest): Promise<AnalyzePromptResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<AnalyzePromptResponse>('/analyze-prompt', {
        prompt: request.prompt,
      });
      return response.data;
    });
  }




  /**
   * Get health status (no retry for faster response)
   */
  async getHealth(): Promise<HealthResponse> {
    // Don't use retry for health checks - we want fast response
    try {
      const response = await this.client.get<HealthResponse>('/health', {
        timeout: 2000, // 2 second timeout
      });
      return response.data;
    } catch (error) {
      // Return a default response if health check fails
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        active_projects: 0,
      };
    }
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<MetricsResponse> {
    return this.withRetry(async () => {
      const response = await this.client.get<MetricsResponse>('/metrics');
      return response.data;
    });
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<ProjectListItem[]> {
    return this.withRetry(async () => {
      const response = await this.client.get<ProjectListItem[]>('/projects');
      return response.data;
    });
  }

  /**
   * Generate screen
   * Endpoint: POST /generate-screen
   */
  async generateScreen(request: GenerateScreenRequest): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post('/generate-screen', {
        prompt: request.prompt,
        project_id: request.project_id,
      });
      return response.data;
    });
  }

  /**
   * Generate image
   * Endpoint: POST /generate-image
   */
  async generateImage(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<ImageGenerateResponse>('/generate-image', {
        prompt: request.prompt,
        project_id: request.project_id,
      });
      return response.data;
    });
  }


  /**
   * Get file content using editor API
   * Endpoint: GET /api/editor/projects/{project_id}/file?path={path}
   */
  async getFileContent(projectId: string, filePath: string): Promise<string> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/editor/projects/${projectId}/file`, {
        params: { path: filePath }
      });
      // Handle both { content: "..." } and direct string responses
      if (typeof response.data === 'string') {
        return response.data;
      }
      return response.data.content || response.data || '';
    });
  }

  /**
   * Get project files (file tree)
   * Endpoint: GET /api/editor/projects/{project_id}/files
   */
  async getProjectFiles(projectId: string): Promise<EditorFileTree> {
    return this.withRetry(async () => {
      const response = await this.client.get<EditorFileTree>(`/editor/projects/${projectId}/files`);
      return response.data;
    });
  }

  /**
   * Update file content using editor API
   * Endpoint: POST /api/editor/projects/{project_id}/file
   */
  async updateFile(projectId: string, filePath: string, content: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/editor/projects/${projectId}/file`, {
        path: filePath,
        content,
      });
      return response.data;
    });
  }

  /**
   * Create file using editor API
   * Endpoint: POST /api/editor/projects/{project_id}/create-file
   */
  async createFile(projectId: string, request: FileCreateRequest): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/editor/projects/${projectId}/create-file`, {
        path: request.path,
        type: request.type,
        content: request.content ?? '',
      });
      return response.data;
    });
  }

  /**
   * Delete file using editor API
   * Endpoint: DELETE /api/editor/projects/{project_id}/file?path={path}
   */
  async deleteFile(projectId: string, filePath: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.delete(`/editor/projects/${projectId}/file`, {
        params: { path: filePath }
      });
      return response.data;
    });
  }

  /**
   * Alternative: Get file content using legacy endpoint
   * Endpoint: GET /files/{project_id}/{file_path}/content
   */
  async getFileContentLegacy(projectId: string, filePath: string): Promise<string> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/files/${projectId}/${filePath}/content`);
      if (typeof response.data === 'string') {
        return response.data;
      }
      return response.data.content || response.data || '';
    });
  }

  /**
   * Alternative: Create file using legacy endpoint
   * Endpoint: POST /files/{project_id}
   */
  async createFileLegacy(projectId: string, request: FileCreateRequest): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/files/${projectId}`, {
        path: request.path,
        type: request.type,
        content: request.content ?? '',
      });
      return response.data;
    });
  }

  /**
   * Alternative: Update file using legacy endpoint
   * Endpoint: PUT /files/{project_id}/{file_path}
   */
  async updateFileLegacy(projectId: string, filePath: string, content: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.put(`/files/${projectId}/${filePath}`, {
        content,
      });
      return response.data;
    });
  }

  /**
   * Alternative: Delete file using legacy endpoint
   * Endpoint: DELETE /files/{project_id}/{file_path}
   */
  async deleteFileLegacy(projectId: string, filePath: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.delete(`/files/${projectId}/${filePath}`);
      return response.data;
    });
  }

  /**
   * Rename file
   * Endpoint: POST /files/{project_id}/{file_path}/rename
   */
  async renameFile(projectId: string, filePath: string, newName: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/files/${projectId}/${filePath}/rename`, {
        new_name: newName,
      });
      return response.data;
    });
  }

  /**
   * Update Supabase configuration
   * Endpoint: PUT /projects/{project_id}/supabase-config
   */
  async updateSupabaseConfig(
    projectId: string,
    config: SupabaseConfigRequest
  ): Promise<SupabaseConfigResponse> {
    return this.withRetry(async () => {
      const response = await this.client.put<SupabaseConfigResponse>(
        `/projects/${projectId}/supabase-config`,
        {
          supabase_url: config.supabase_url,
          supabase_anon_key: config.supabase_anon_key,
        }
      );
      return response.data;
    });
  }

  /**
   * Get Supabase configuration status
   * Endpoint: GET /projects/{project_id}/supabase-config
   */
  async getSupabaseConfigStatus(projectId: string): Promise<SupabaseConfigStatusResponse> {
    return this.withRetry(async () => {
      const response = await this.client.get<SupabaseConfigStatusResponse>(
        `/projects/${projectId}/supabase-config`
      );
      return response.data;
    });
  }

  /**
   * Test Supabase connection
   * Endpoint: POST /projects/{project_id}/test-supabase
   */
  async testSupabaseConnection(
    projectId: string,
    config: SupabaseConfigRequest
  ): Promise<SupabaseTestResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<SupabaseTestResponse>(
        `/projects/${projectId}/test-supabase`,
        {
          supabase_url: config.supabase_url,
          supabase_anon_key: config.supabase_anon_key,
        }
      );
      return response.data;
    });
  }

  /**
   * Apply template to project
   * Endpoint: POST /apply-template
   */
  async applyTemplate(request: ApplyTemplateRequest): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post('/apply-template', {
        project_id: request.project_id,
        template_id: request.template_id,
      });
      return response.data;
    });
  }

  /**
   * Get templates
   * Endpoint: GET /api/templates or GET /templates
   */
  async getTemplates(): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get('/templates');
      return response.data;
    });
  }

  /**
   * Get template preview
   * Endpoint: GET /template-preview/{template_id}
   */
  async getTemplatePreview(templateId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/template-preview/${templateId}`);
      return response.data;
    });
  }

  /**
   * Manual activate project
   * Endpoint: POST /projects/{project_id}/manual-activate
   */
  async manualActivate(projectId: string, request: ManualActivateRequest): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/projects/${projectId}/manual-activate`, {
        preview_url: request.preview_url,
      });
      return response.data;
    });
  }

  /**
   * Build project
   * Endpoint: POST /api/build/projects/{project_id}/build
   */
  async buildProject(projectId: string, request?: BuildRequest): Promise<BuildResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<BuildResponse>(
        `/build/projects/${projectId}/build`,
        {
          use_shared_deps: request?.use_shared_deps ?? true,
          force_rebuild: request?.force_rebuild ?? false,
        }
      );
      return response.data;
    });
  }

  /**
   * Get build status
   * Endpoint: GET /api/build/projects/{project_id}/build-status
   */
  async getBuildStatus(projectId: string): Promise<BuildStatusResponse> {
    return this.withRetry(async () => {
      const response = await this.client.get<BuildStatusResponse>(
        `/build/projects/${projectId}/build-status`
      );
      return response.data;
    });
  }

  /**
   * Stop build
   * Endpoint: POST /api/build/projects/{project_id}/stop
   */
  async stopBuild(projectId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/build/projects/${projectId}/stop`);
      return response.data;
    });
  }

  /**
   * Rebuild project
   * Endpoint: POST /api/build/projects/{project_id}/rebuild
   */
  async rebuildProject(projectId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/build/projects/${projectId}/rebuild`);
      return response.data;
    });
  }

  /**
   * List active builds
   * Endpoint: GET /api/build/active-builds
   */
  async listActiveBuilds(): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get('/build/active-builds');
      return response.data;
    });
  }
}

// All types are now imported from api-types.ts

// Export a default instance
export const apiClient = new APIClient();
