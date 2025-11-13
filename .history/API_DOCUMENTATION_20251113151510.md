# AI Expo Builder - API Documentation

## Base URL

**Production:** `https://mobile-generator-backend-1098053868371.us-central1.run.app`
**Development:** `http://localhost:8000`

---

## 📋 Table of Contents

- [Backend API Endpoints](#backend-api-endpoints)
- [Frontend Pages](#frontend-pages)
- [Frontend Components](#frontend-components)
- [Request/Response Models](#requestresponse-models)
- [WebSocket Endpoints](#websocket-endpoints)
- [Error Handling](#error-handling)

---

## 🔌 Backend API Endpoints

### 1. Root Endpoint

**GET** `/`

Get API status and version information.

**Response:**

```json
{
  "message": "AI Expo App Builder API",
  "version": "1.0.0",
  "status": "running"
}
```

---

### 2. Generate App

**POST** `/generate`

Generate a new Expo application from a natural language prompt.

**Request Body:**

```json
{
  "prompt": "Create a todo list app with dark mode",
  "user_id": "user123",
  "template_id": "modern_dark"
}
```

**Parameters:**

- `prompt` (required): Natural language description (10-5000 chars)
- `user_id` (optional): User identifier (default: "anonymous")
- `template_id` (optional): UI template ID to apply

**Response:**

```json
{
  "project_id": "abc123def456",
  "preview_url": "https://example.ngrok.io",
  "status": "success",
  "message": "App generated successfully",
  "created_at": "2025-11-10T12:00:00"
}
```

**Status Codes:**

- `201`: Created successfully
- `422`: Validation error
- `503`: Resource limit exceeded

---

### 3. Get Project Status

**GET** `/status/{project_id}`

Get the current status of a project generation.

**Response:**

```json
{
  "project_id": "abc123def456",
  "status": "ready",
  "preview_url": "https://example.ngrok.io",
  "error": null,
  "created_at": "2025-11-10T12:00:00",
  "last_active": "2025-11-10T12:05:00"
}
```

**Status Values:**

- `initializing`: Creating project structure
- `generating_code`: AI is generating code
- `installing_deps`: Installing npm dependencies
- `starting_server`: Starting Expo development server
- `creating_tunnel`: Creating public tunnel
- `ready`: App is ready to preview
- `error`: Generation failed

---

### 4. Download Project

**GET** `/download/{project_id}`

Download project as a ZIP archive.

**Response:** Binary ZIP file

**Headers:**

```
Content-Type: application/zip
Content-Disposition: attachment; filename=expo-app-{project_id}.zip
```

---

### 5. Get Project Files

**GET** `/files/{project_id}`

Get the file tree structure of a project.

**Response:**

```json
{
  "project_id": "abc123def456",
  "file_tree": [
    {
      "name": "app",
      "type": "folder",
      "path": "app",
      "children": [
        {
          "name": "index.tsx",
          "type": "file",
          "path": "app/index.tsx",
          "content": "import React from 'react'..."
        }
      ]
    }
  ]
}
```

---

### 6. List All Projects

**GET** `/projects`

List all projects in the system.

**Response:**

```json
{
  "projects": [
    {
      "id": "abc123def456",
      "name": "abc123def456",
      "status": "ready",
      "preview_url": "https://example.ngrok.io",
      "preview_urls": ["https://example.ngrok.io"],
      "created_at": "2025-11-10T12:00:00",
      "last_active": "2025-11-10T12:05:00",
      "prompt": "Create a todo list app...",
      "is_active": true
    }
  ],
  "total": 1
}
```

---

### 7. Activate Project

**POST** `/projects/{project_id}/activate`

Reactivate an inactive project (starts server and creates tunnel).

**Response:**

```json
{
  "project_id": "abc123def456",
  "status": "ready",
  "preview_url": "https://example.ngrok.io",
  "message": "Project activated successfully"
}
```

**Note:** This operation can take up to 90 seconds for server start + 30 seconds for tunnel creation.

---

### 8. Get Templates

**GET** `/templates`

Get all available UI templates.

**Response:**

```json
{
  "templates": [
    {
      "id": "modern_dark",
      "name": "Modern Dark",
      "description": "Sleek dark theme with vibrant accents",
      "colors": {
        "primary": "#6366f1",
        "secondary": "#8b5cf6",
        "accent": "#ec4899",
        "background": "#0f172a",
        "surface": "#1e293b",
        "text_primary": "#f1f5f9",
        "text_secondary": "#94a3b8"
      },
      "preview_image": null,
      "preview_url": "/template-preview/modern_dark"
    }
  ]
}
```

---

### 9. Get Template Preview

**GET** `/template-preview/{template_id}`

Get HTML preview of a template.

**Response:** HTML page showing the template with dummy data

---

### 10. Apply Template

**POST** `/apply-template`

Apply a UI template to an existing project.

**Request Body:**

```json
{
  "project_id": "abc123def456",
  "template_id": "modern_dark"
}
```

**Response:**

```json
{
  "success": true,
  "template": "Modern Dark",
  "files_updated": ["app/index.tsx", "components/Button.tsx", "theme.ts"],
  "message": "Applied Modern Dark template to 3 files"
}
```

---

### 11. Health Check

**GET** `/health`

Health check endpoint for load balancers.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T12:00:00",
  "active_projects": 5,
  "system_metrics": {
    "cpu_percent": 45.2,
    "memory_percent": 62.8,
    "disk_percent": 35.1
  }
}
```

---

### 12. Get Metrics

**GET** `/metrics`

Prometheus-compatible metrics endpoint.

**Response:**

```json
{
  "cpu_percent": 45.2,
  "memory_percent": 62.8,
  "disk_percent": 35.1,
  "active_projects": 5,
  "total_projects_created": 127,
  "average_generation_time": 45.3
}
```

---

### 13. Chat Edit

**POST** `/chat/edit`

AI-powered file editing through chat.

**Request Body:**

```json
{
  "project_id": "abc123def456",
  "prompt": "Add a login button to the home screen"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Updated 2 file(s)",
  "files_modified": ["app/index.tsx", "components/LoginButton.tsx"],
  "changes_summary": "Added login button component and integrated it into home screen"
}
```

**Note:** You can mention specific files using `@filename` syntax in the prompt.

---

### 14. Generate Screen

**POST** `/generate-screen`

Generate new screen/component files based on a prompt.

**Request Body:**

```json
{
  "prompt": "Create a profile screen with avatar and bio",
  "project_id": "abc123def456"
}
```

**Response:**

```json
{
  "success": true,
  "files_created": ["app/profile.tsx", "components/Avatar.tsx"],
  "summary": "Created profile screen with avatar component",
  "message": "Created 2 file(s)"
}
```

---

### 15. Generate Image

**POST** `/generate-image`

Generate an image using AI (Gemini/OpenAI).

**Request Body:**

```json
{
  "prompt": "A cute cartoon cat",
  "project_id": "abc123def456"
}
```

**Response:**

```json
{
  "success": true,
  "image_url": "/projects/abc123def456/assets/images/generated_abc123.png",
  "filename": "generated_abc123.png",
  "message": "Image generated successfully"
}
```

---

## 📁 File Management Endpoints

### 16. Get File Content

**GET** `/files/{project_id}/{file_path}/content`

Get the content of a specific file.

**Response:**

```json
{
  "content": "import React from 'react'...",
  "path": "app/index.tsx"
}
```

---

### 17. Update File

**PUT** `/files/{project_id}/{file_path}`

Update file content.

**Request Body:**

```json
{
  "content": "import React from 'react'..."
}
```

**Response:**

```json
{
  "success": true,
  "path": "app/index.tsx"
}
```

---

### 18. Create File/Folder

**POST** `/files/{project_id}`

Create a new file or folder.

**Request Body:**

```json
{
  "path": "components/NewComponent.tsx",
  "type": "file",
  "content": "import React from 'react'..."
}
```

**Response:**

```json
{
  "success": true,
  "path": "components/NewComponent.tsx"
}
```

---

### 19. Delete File

**DELETE** `/files/{project_id}/{file_path}`

Delete a file or folder.

**Response:**

```json
{
  "success": true
}
```

---

### 20. Rename File

**POST** `/files/{project_id}/{file_path}/rename`

Rename a file or folder.

**Request Body:**

```json
{
  "new_name": "NewFileName.tsx"
}
```

**Response:**

```json
{
  "success": true,
  "new_name": "NewFileName.tsx"
}
```

---

## 🔌 WebSocket Endpoints

### 21. File Watcher

**WebSocket** `/ws/watch/{project_id}`

Real-time file change notifications.

**Message Format:**

```json
{
  "type": "file_change",
  "files": ["app/index.tsx", "components/Button.tsx"],
  "timestamp": 1699632000
}
```

**Usage:**

```javascript
const ws = new WebSocket('wss://api.example.com/ws/watch/abc123def456');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Files changed:', data.files);
};
```

---

## 🎨 Frontend Pages

### Main Application Page

**Path:** `/`
**File:** `frontend/app/page.tsx`

The main application interface with three resizable panels:

1. **Left Panel (Chat)**: AI chat interface for creating and editing apps
2. **Center Panel (Code Editor)**: Monaco-based code editor with file tree
3. **Right Panel (Preview)**: Live preview of the generated app

**Features:**

- Generate new apps from natural language prompts
- Edit existing apps through chat
- Real-time file watching and preview updates
- Project selector for switching between projects
- Download projects as ZIP files
- Resizable panels with drag handles

---

## 🧩 Frontend Components

### 1. ChatPanel

**File:** `frontend/components/ChatPanel.tsx`

AI chat interface for app generation and editing.

**Props:**

- `onSubmit`: Callback for generating new apps
- `onEdit`: Callback for editing existing apps
- `isLoading`: Loading state
- `messages`: Chat message history
- `projectId`: Current project ID
- `hasActiveProject`: Whether a project is active
- `onImageGenerate`: Callback for image generation

**Features:**

- Three modes: Create, Edit, Image
- Template selector for UI themes
- File mention support with `@filename`
- Image generation with preview
- Message history with timestamps

---

### 2. CodeEditor

**File:** `frontend/components/CodeEditor.tsx`

Monaco-based code editor with file tree navigation.

**Props:**

- `projectId`: Current project ID
- `fileTree`: File tree structure
- `onFileSelect`: Callback when file is selected
- `onFileUpdate`: Callback when file is saved
- `onFileChange`: Callback when file structure changes

**Features:**

- File tree with expand/collapse
- Multiple file tabs
- Syntax highlighting
- Auto-save with Ctrl+S
- File operations (create, delete, rename)
- Context menu for file operations
- Unsaved changes indicator

---

### 3. PreviewFrame

**File:** `frontend/components/PreviewFrame.tsx`

Live preview of the generated app with device emulation.

**Props:**

- `url`: Preview URL
- `status`: Generation status
- `error`: Error message (if any)
- `onRetry`: Retry callback
- `onDownload`: Download callback
- `projectId`: Current project ID
- `refreshKey`: Key to force refresh

**Features:**

- Device emulation (iPhone, Pixel, iPad, etc.)
- QR code for mobile testing
- Single/multi-device view
- Auto-refresh on file changes
- Copy preview URL
- Loading states

---

### 4. ProjectSelector

**File:** `frontend/components/ProjectSelector.tsx`

Dropdown for selecting and switching between projects.

**Props:**

- `onSelectProject`: Callback when project is selected
- `currentProjectId`: Currently active project ID

**Features:**

- List all projects
- Show project status (active/inactive)
- Display creation date and last active time
- Show project prompts
- Auto-refresh project list

---

### 5. PromptInput

**File:** `frontend/components/PromptInput.tsx`

Text input for entering prompts with template selection.

**Features:**

- Multi-line text input
- Template selector button
- Character count
- Submit on Enter (Shift+Enter for new line)

---

### 6. ProgressIndicator

**File:** `frontend/components/ProgressIndicator.tsx`

Visual progress indicator for app generation.

**Features:**

- Step-by-step progress display
- Status messages
- Error states
- Animated transitions

---

### 7. Notification

**File:** `frontend/components/Notification.tsx`

Toast notification component.

**Props:**

- `type`: Notification type (success, error, info, warning)
- `message`: Main message
- `suggestion`: Optional suggestion text
- `onClose`: Close callback

**Features:**

- Auto-dismiss after 5 seconds
- Color-coded by type
- Slide-in animation
- Close button

---

## 📦 Request/Response Models

### GenerateRequest

```typescript
{
  prompt: string;        // 10-5000 chars
  userId?: string;       // Optional user ID
  template_id?: string;  // Optional template ID
}
```

### GenerateResponse

```typescript
{
  project_id: string;
  preview_url: string | null;
  status: 'success' | 'error';
  message: string;
  created_at: string;
  error?: string;
}
```

### ProjectStatus

```typescript
{
  id: string;
  status: 'initializing' | 'generating_code' | 'installing_deps' | 
          'starting_server' | 'creating_tunnel' | 'ready' | 'error';
  preview_url: string | null;
  error: string | null;
  created_at: string;
}
```

### ChatEditRequest

```typescript
{
  project_id: string;
  prompt: string;  // 10-2000 chars
}
```

### ChatEditResponse

```typescript
{
  success: boolean;
  message: string;
  files_modified: string[];
  changes_summary: string;
}
```

### FileNode

```typescript
{
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
}
```

---

## ⚠️ Error Handling

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "suggestion": "Suggestion for fixing the error",
  "project_id": "abc123def456",
  "timestamp": "2025-11-10T12:00:00"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid request data
- `RESOURCE_LIMIT_ERROR`: System resource limits exceeded
- `PROJECT_NOT_FOUND`: Project doesn't exist
- `PROJECT_NOT_READY`: Project not in ready state
- `AI_GENERATION_ERROR`: AI generation failed
- `TUNNEL_CREATION_ERROR`: Failed to create tunnel
- `SERVER_START_ERROR`: Failed to start Expo server
- `METRICS_ERROR`: Failed to retrieve metrics

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad request
- `404`: Not found
- `422`: Validation error
- `500`: Internal server error
- `503`: Service unavailable
- `504`: Gateway timeout

---

## 🔐 Authentication

Most endpoints require API key authentication via the `X-API-Key` header:

```
X-API-Key: your-api-key-here
```

**Protected Endpoints:**

- POST `/generate`
- POST `/chat/edit`
- POST `/apply-template`
- POST `/generate-screen`

**Public Endpoints:**

- GET `/`
- GET `/health`
- GET `/metrics`
- GET `/status/{project_id}`
- GET `/projects`
- GET `/templates`
- GET `/template-preview/{template_id}`

---

## 📊 Rate Limiting

The API implements rate limiting:

- **Default:** 10 requests per minute per IP
- **Exceeded:** Returns `429 Too Many Requests`

---

## 🚀 Usage Examples

### Generate a New App

```typescript
import { apiClient } from '@/lib/api-client';

const response = await apiClient.generate({
  prompt: 'Create a weather app with current conditions',
  template_id: 'ocean_blue'
});

console.log('Project ID:', response.project_id);
```

### Poll for Status

```typescript
const status = await apiClient.pollStatus(projectId, {
  intervalMs: 2000,
  maxAttempts: 150,
  onStatusUpdate: (status) => {
    console.log('Status:', status.status);
  }
});
```

### Edit with Chat

```typescript
const result = await apiClient.chatEdit(projectId, 
  'Add a dark mode toggle to the settings screen'
);

console.log('Files modified:', result.files_modified);
```

### Activate Inactive Project

```typescript
const result = await apiClient.activateProject(projectId);
console.log('Preview URL:', result.preview_url);
```

---

## 📝 Notes

1. **Generation Time**: App generation typically takes 2-5 minutes
2. **Server Start**: Reactivating projects can take up to 90 seconds
3. **File Watching**: Uses WebSocket with polling fallback
4. **Preview Refresh**: Automatic on file changes (5-second polling)
5. **Project Cleanup**: Projects are kept for debugging (not auto-deleted)
6. **Template Application**: Can be applied during generation or after
7. **File Mentions**: Use `@filename` in chat to focus edits on specific files
8. **Image Generation**: Supports both Gemini and OpenAI fallback

---

## 🔗 Related Files

- **API Client:** `frontend/lib/api-client.ts`
- **Backend Main:** `backend/main.py`
- **Config:** `backend/config.py`
- **Models:** `backend/models/`
- **Services:** `backend/services/`

---

**Last Updated:** November 10, 2025
**API Version:** 1.0.0
