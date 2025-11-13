import axios, { AxiosInstance, AxiosError } from 'axios';

// Request/Response Types
export interface GenerateRequest {
  prompt: string;
  userId?: string;
  template_id?: string;
}

export interface GenerateResponse {
  project_id: string;
  status: 'success' | 'error';
  error?: string;
}

export interface FastGenerateResponse {
  project_id: string;
  websocket_url: string;
  status: 'success' | 'error';
  error?: string;
}

export interface ProjectStatus {
  id: string;
  status: 'initializing' | 'generating_code' | 'installing_deps' | 'starting_server' | 'creating_tunnel' | 'ready' | 'error';
  preview_url: string | null;
  error: string | null;
  created_at: string;
}



export interface PollingConfig {
  intervalMs: number;
  maxAttempts: number;
  onStatusUpdate?: (status: ProjectStatus) => void;
}

const DEFAULT_POLLING_CONFIG: PollingConfig = {
  intervalMs: 2000, // Poll every 2 seconds
  maxAttempts: 150, // 5 minutes max (150 * 2s = 300s)
};

export interface ErrorResponse {
  error: string;
  message: string;
  suggestion: string;
  project_id?: string;
  timestamp: string;
}

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
  }

  /**
   * Generate a new Expo app from a prompt (legacy - waits for completion)
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<GenerateResponse>('/generate', request);
      return response.data;
    });
  }

  /**
   * Fast generate - returns immediately, processes in background
   * Use WebSocket for real-time updates
   */
  async fastGenerate(request: GenerateRequest & { user_id?: string }): Promise<FastGenerateResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<FastGenerateResponse>('/v1/fast-generate', {
        prompt: request.prompt,
        user_id: request.user_id || 'anonymous',
        template_id: request.template_id,
      });
      return response.data;
    });
  }

  /**
   * Get the current status of a project
   */
  async getStatus(projectId: string): Promise<ProjectStatus> {
    return this.withRetry(async () => {
      const response = await this.client.get<ProjectStatus>(`/status/${projectId}`);
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
   */
  async chatEdit(projectId: string, prompt: string): Promise<ChatEditResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<ChatEditResponse>('/chat/edit', {
        project_id: projectId,
        prompt,
      });
      return response.data;
    });
  }

  /**
   * Get logs for a project
   */
  async getLogs(
    projectId: string,
    options?: {
      hours?: number;
      limit?: number;
      severity?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    }
  ): Promise<{ logs: any[]; total?: number }> {
    return this.withRetry(async () => {
      const params = new URLSearchParams();
      if (options?.hours) params.append('hours', options.hours.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.severity) params.append('severity', options.severity);
      
      const queryString = params.toString();
      const url = `/logs/${projectId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.client.get<{ logs: any[]; total?: number }>(url);
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
   * Poll project status until it reaches a terminal state (ready or error)
   */
  async pollStatus(
    projectId: string,
    config?: Partial<PollingConfig>
  ): Promise<ProjectStatus> {
    const pollingConfig = { ...DEFAULT_POLLING_CONFIG, ...config };
    let attempts = 0;

    while (attempts < pollingConfig.maxAttempts) {
      try {
        const status = await this.getStatus(projectId);
        
        // Notify callback if provided
        if (pollingConfig.onStatusUpdate) {
          pollingConfig.onStatusUpdate(status);
        }

        // Check if we've reached a terminal state
        if (status.status === 'ready' || status.status === 'error') {
          return status;
        }

        // Wait before next poll
        await this.sleep(pollingConfig.intervalMs);
        attempts++;
      } catch (error) {
        // If status endpoint fails, throw the error
        throw error;
      }
    }

    // Timeout reached
    throw new Error('Status polling timed out. The project may still be processing.');
  }

  /**
   * Generate an app and poll until completion
   */
  async generateAndWait(
    request: GenerateRequest,
    pollingConfig?: Partial<PollingConfig>
  ): Promise<ProjectStatus> {
    // Start generation
    const generateResponse = await this.generate(request);
    
    if (generateResponse.status === 'error') {
      throw new Error(generateResponse.error || 'Generation failed');
    }

    // Poll until complete
    return this.pollStatus(generateResponse.project_id, pollingConfig);
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
   */
  async analyzePrompt(prompt: string): Promise<AnalyzePromptResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<AnalyzePromptResponse>('/analyze-prompt', { prompt });
      return response.data;
    });
  }

  /**
   * Initiate streaming generation
   */
  async streamingGenerate(request: StreamingGenerateRequest): Promise<StreamingGenerateResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<StreamingGenerateResponse>('/v1/generate-stream', {
        prompt: request.prompt,
        user_id: request.user_id || 'anonymous',
        template_id: request.template_id,
        fast_mode: request.fast_mode || false,
      });
      return response.data;
    });
  }

  /**
   * Get stream status
   */
  async getStreamStatus(projectId: string): Promise<StreamStatusResponse> {
    return this.withRetry(async () => {
      const response = await this.client.get<StreamStatusResponse>(`/v1/stream-status/${projectId}`);
      return response.data;
    });
  }

  /**
   * Get quick status (ultra-fast status check)
   */
  async getQuickStatus(projectId: string): Promise<QuickStatusResponse> {
    return this.withRetry(async () => {
      const response = await this.client.get<QuickStatusResponse>(`/quick-status/${projectId}`);
      return response.data;
    });
  }

  /**
   * List bucket projects
   */
  async listBucketProjects(): Promise<BucketProjectsResponse> {
    return this.withRetry(async () => {
      const response = await this.client.get<BucketProjectsResponse>('/bucket-projects');
      return response.data;
    });
  }

  /**
   * Download from storage
   */
  async downloadFromStorage(projectId: string): Promise<Blob> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/download-from-storage/${projectId}`, {
        responseType: 'blob',
      });
      return response.data;
    });
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<HealthResponse> {
    return this.withRetry(async () => {
      const response = await this.client.get<HealthResponse>('/health');
      return response.data;
    });
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
   * Generate screen
   */
  async generateScreen(request: GenerateScreenRequest): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post('/generate-screen', request);
      return response.data;
    });
  }

  /**
   * Generate image
   */
  async generateImage(request: ImageGenerateRequest): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post('/generate-image', request);
      return response.data;
    });
  }

  /**
   * Manual activate project
   */
  async manualActivate(projectId: string, previewUrl: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/projects/${projectId}/manual-activate`, {
        preview_url: previewUrl,
      });
      return response.data;
    });
  }

  /**
   * Get project files
   */
  async getProjectFiles(projectId: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/files/${projectId}`);
      return response.data;
    });
  }

  /**
   * Get file content
   */
  async getFileContent(projectId: string, filePath: string): Promise<string> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/files/${projectId}/${filePath}/content`);
      return response.data.content || response.data;
    });
  }

  /**
   * Create file
   */
  async createFile(projectId: string, request: FileCreateRequest): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/files/${projectId}`, request);
      return response.data;
    });
  }

  /**
   * Update file
   */
  async updateFile(projectId: string, filePath: string, content: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.put(`/files/${projectId}/${filePath}`, {
        content,
      });
      return response.data;
    });
  }

  /**
   * Delete file
   */
  async deleteFile(projectId: string, filePath: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.delete(`/files/${projectId}/${filePath}`);
      return response.data;
    });
  }

  /**
   * Rename file
   */
  async renameFile(projectId: string, filePath: string, newName: string): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.post(`/files/${projectId}/${filePath}/rename`, {
        new_name: newName,
      });
      return response.data;
    });
  }
}

export interface ChatEditResponse {
  success: boolean;
  message: string;
  files_modified: string[];
  changes_summary: string;
}

// Additional types from API documentation
export interface AnalyzePromptRequest {
  prompt: string;
}

export interface AnalyzePromptResponse {
  screens: Array<{
    name: string;
    description: string;
  }>;
  images: Array<{
    description: string;
    path: string;
  }>;
  total_screens: number;
  total_images: number;
}

export interface StreamingGenerateRequest {
  prompt: string;
  user_id?: string;
  template_id?: string;
  fast_mode?: boolean;
}

export interface StreamingGenerateResponse {
  project_id: string;
  websocket_url: string;
  message: string;
}

export interface StreamStatusResponse {
  project_id: string;
  status: string;
  progress?: number;
  message?: string;
}

export interface BucketProjectInfo {
  project_id: string;
  file_name: string;
  size_mb: number;
  created_at: string;
  updated_at: string;
  gcs_path: string;
  download_url: string;
}

export interface BucketProjectsResponse {
  total_projects: number;
  total_size_mb: number;
  projects: BucketProjectInfo[];
  bucket_name: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  active_projects: number;
  system_metrics?: {
    cpu_percent?: number;
    memory_percent?: number;
    disk_percent?: number;
  };
}

export interface MetricsResponse {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  active_projects: number;
  total_projects_created: number;
  average_generation_time: number;
}

export interface QuickStatusResponse {
  project_id: string;
  status: string;
  has_preview: boolean;
}

export interface FileCreateRequest {
  path: string;
  type: string;
  content?: string;
}

export interface FileRenameRequest {
  new_name: string;
}

export interface FileContentRequest {
  content: string;
}

export interface GenerateScreenRequest {
  prompt: string;
  project_id: string;
}

export interface ImageGenerateRequest {
  prompt: string;
  project_id: string;
}

export interface ManualActivateRequest {
  preview_url: string;
}


// Export a default instance
export const apiClient = new APIClient();
