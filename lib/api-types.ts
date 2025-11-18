/**
 * TypeScript types generated from OpenAPI 3.1.0 specification
 * AI Expo App Builder API
 */

// ============================================================================
// Request/Response Types
// ============================================================================

export interface FastGenerateRequest {
  prompt: string;
  user_id?: string | null;
  template_id?: string | null;
}

export interface FastGenerateResponse {
  project_id: string;
  status: string;
  message: string;
  websocket_url: string;
}

export interface StreamingGenerateRequest {
  prompt: string;
  user_id?: string | null;
  template_id?: string | null;
  fast_mode?: boolean | null;
}

export interface StreamingGenerateResponse {
  project_id: string;
  websocket_url: string;
  message: string;
}

export interface BuildStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface ProjectStatusResponse {
  project_id: string;
  status: string;
  preview_url: string | null;
  error?: string | null;
  created_at: string;
  last_active: string;
  current_step?: number;
  build_steps?: BuildStep[];
}

export interface GenerateRequest {
  prompt: string;
  user_id?: string | null;
  template_id?: string | null;
}

export interface GenerateResponse {
  project_id: string;
  preview_url: string | null;
  status: string;
  message: string;
  created_at: string;
}

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

export interface ChatEditRequest {
  project_id: string;
  prompt: string;
}

export interface ChatEditResponse {
  success: boolean;
  message: string;
  files_modified: string[];
  changes_summary: string;
}

export interface FileUpdate {
  path: string;
  content: string;
}

export interface FileCreateRequest {
  path: string;
  type: string;
  content?: string;
}

export interface FileContentRequest {
  content: string;
}

export interface FileRenameRequest {
  new_name: string;
}

export interface GenerateScreenRequest {
  prompt: string;
  project_id: string;
}

export interface ImageGenerateRequest {
  prompt: string;
  project_id: string;
}

export interface ImageGenerateResponse {
  image_url?: string;
  filename?: string;
  path?: string;
  is_placeholder?: boolean;
  message?: string;
}

export interface SupabaseConfigRequest {
  supabase_url: string;
  supabase_anon_key: string;
}

export interface SupabaseConfigResponse {
  success: boolean;
  message: string;
  project_id: string;
}

export interface SupabaseConfigStatusResponse {
  configured: boolean;
  has_url: boolean;
  has_key: boolean;
  message: string;
}

export interface SupabaseTestResponse {
  success: boolean;
  message: string;
  project_name?: string | null;
}

export interface ApplyTemplateRequest {
  project_id: string;
  template_id: string;
}

export interface BuildRequest {
  use_shared_deps?: boolean;
  force_rebuild?: boolean;
}

export interface BuildResponse {
  project_id: string;
  status: string;
  preview_url: string | null;
  message: string;
  using_shared_deps: boolean;
}

export interface BuildStatusResponse {
  project_id: string;
  is_building: boolean;
  is_running: boolean;
  preview_url: string | null;
}

export interface ManualActivateRequest {
  preview_url: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  active_projects: number;
  system_metrics?: {
    cpu_percent?: number;
    memory_percent?: number;
    disk_percent?: number;
  } | null;
}

export interface MetricsResponse {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  active_projects: number;
  total_projects_created: number;
  average_generation_time: number;
}

export interface ProjectListItem {
  id: string;
  name?: string;
  status: 'initializing' | 'generating_code' | 'installing_deps' | 'starting_server' | 'creating_tunnel' | 'ready' | 'error' | 'inactive';
  preview_url: string | null;
  created_at: string;
  updated_at?: string;
  last_active?: string;
}

export interface TunnelURL {
  url: string;
  created_at: string;
  is_active: boolean;
  port: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  suggestion?: string;
  project_id?: string;
  timestamp: string;
}

// Editor API Types
export interface EditorFileTree {
  [key: string]: any; // File tree structure can vary
}

// Validation Error Types
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

