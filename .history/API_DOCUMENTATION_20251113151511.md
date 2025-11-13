
```
{
  "openapi": "3.1.0",
  "info": {
    "title": "AI Expo App Builder",
    "description": "Generate React Native + Expo applications from natural language prompts",
    "version": "1.0.0"
  },
  "paths": {
    "/api/v1/generate-stream": {
      "post": {
        "tags": [
          "streaming"
        ],
        "summary": "Initiate Streaming Generation",
        "description": "Initiate streaming app generation\n\nReturns a project_id and WebSocket URL for real-time updates.\nClient should connect to WebSocket to receive progress updates.",
        "operationId": "initiate_streaming_generation_api_v1_generate_stream_post",
        "parameters": [
          {
            "name": "x-api-key",
            "in": "header",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "X-Api-Key"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/StreamingGenerateRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StreamingGenerateResponse"
                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/stream-status/{project_id}": {
      "get": {
        "tags": [
          "streaming"
        ],
        "summary": "Get Stream Status",
        "description": "Get current status of a streaming generation",
        "operationId": "get_stream_status_api_v1_stream_status__project_id__get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/fast-generate": {
      "post": {
        "tags": [
          "fast-generate"
        ],
        "summary": "Fast Generate",
        "description": "Fast generation endpoint - returns immediately\n\nThis endpoint:\n1. Validates input\n2. Returns project_id immediately\n3. Processes generation in background\n4. Sends updates via WebSocket\n\nClient should connect to WebSocket to receive updates.",
        "operationId": "fast_generate_api_v1_fast_generate_post",
        "parameters": [
          {
            "name": "x-api-key",
            "in": "header",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "X-Api-Key"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FastGenerateRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FastGenerateResponse"
                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/project-status/{project_id}": {
      "get": {
        "summary": "Get Project Status",
        "description": "Alias for /status/{project_id} - Get current status of a project\nReturns simplified status information for terminal display",
        "operationId": "get_project_status_project_status__project_id__get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/quick-status/{project_id}": {
      "get": {
        "tags": [
          "projects"
        ],
        "summary": "Get Quick Status",
        "description": "Ultra-fast status check\n\nReturns minimal information for quick polling.",
        "operationId": "get_quick_status_quick_status__project_id__get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/download-from-storage/{project_id}": {
      "get": {
        "tags": [
          "projects"
        ],
        "summary": "Download From Storage",
        "description": "Download project from Cloud Storage\n\nRetrieves project ZIP from GCS bucket.",
        "operationId": "download_from_storage_download_from_storage__project_id__get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/bucket-projects": {
      "get": {
        "tags": [
          "projects"
        ],
        "summary": "List Bucket Projects",
        "description": "List all projects stored in Cloud Storage bucket\n\nReturns detailed information about each project including:\n- Project ID\n- File size\n- Creation/update timestamps\n- Download URLs",
        "operationId": "list_bucket_projects_bucket_projects_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BucketProjectsResponse"
                }
              }
            }
          }
        }
      }
    },
    "/": {
      "get": {
        "summary": "Root",
        "description": "Root endpoint",
        "operationId": "root__get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          }
        }
      }
    },
    "/generate": {
      "post": {
        "summary": "Generate",
        "description": "Generate a new Expo application from natural language prompt\n\nImproved workflow with detailed AI analysis:\n1. Check system capacity\n2. AI Analysis Phase - Analyze prompt and decide:\n   - App name\n   - All components needed\n   - All screens with dummy data\n   - Complete app structure\n3. Create Expo project with analyzed structure\n4. Generate and add screens one by one with detailed logging\n5. Setup preview (install deps + start server + create tunnel)\n\nReturns project ID and preview URL on success.",
        "operationId": "generate_generate_post",
        "parameters": [
          {
            "name": "x-api-key",
            "in": "header",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "X-Api-Key"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GenerateRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GenerateResponse"
                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/status/{project_id}": {
      "get": {
        "summary": "Get Status",
        "description": "Get current status of a project generation\n\nReturns project status, preview URL (if ready), and error information (if failed).\nThis endpoint is used by the frontend to poll for progress updates.",
        "operationId": "get_status_status__project_id__get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/main__ProjectStatusResponse"
                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/logs/{project_id}": {
      "get": {
        "summary": "Get Project Logs",
        "description": "Get Google Cloud logs for a specific project\n\nFetches logs from Google Cloud Logging API including:\n- Cloud Run service logs\n- Cloud Build logs\n- Any logs related to the project\n\nArgs:\n    project_id: Project identifier\n    hours: Number of hours to look back (default: 24, max: 168)\n    limit: Maximum number of log entries to return (default: 1000, max: 10000)\n    severity: Filter by severity (DEBUG, INFO, WARNING, ERROR, CRITICAL)\n    \nReturns:\n    ProjectLogsResponse with log entries from Google Cloud",
        "operationId": "get_project_logs_logs__project_id__get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          },
          {
            "name": "hours",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 24,
              "title": "Hours"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "default": 1000,
              "title": "Limit"
            }
          },
          {
            "name": "severity",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Severity"
            }
          },
          {
            "name": "x-api-key",
            "in": "header",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "X-Api-Key"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ProjectLogsResponse"
                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/download/{project_id}": {
      "get": {
        "summary": "Download Project",
        "description": "Download project as ZIP archive\n\nCreates a ZIP archive of the project (excluding node_modules and build artifacts)\nand returns it as a file download. The archive is automatically cleaned up after\ndownload.",
        "operationId": "download_project_download__project_id__get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/files/{project_id}": {
      "get": {
        "summary": "Get Project Files",
        "description": "Get project file tree structure\n\nReturns the file tree of the project with file contents for preview",
        "operationId": "get_project_files_files__project_id__get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create File",
        "description": "Create file/folder - automatically generates icons and images if it's a screen file",
        "operationId": "create_file_files__project_id__post",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FileCreateRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/api/projects": {
      "get": {
        "summary": "List Projects",
        "description": "List all projects in the projects folder\n\nReturns a list of all projects with their metadata",
        "operationId": "list_projects_api_projects_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          }
        }
      }
    },
    "/projects": {
      "get": {
        "summary": "List Projects",
        "description": "List all projects in the projects folder\n\nReturns a list of all projects with their metadata",
        "operationId": "list_projects_projects_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          }
        }
      }
    },
    "/analyze-prompt": {
      "post": {
        "summary": "Analyze Prompt",
        "description": "Analyze a prompt and return suggested screens and images WITHOUT generating the project\n\nThis endpoint helps users preview what will be created before committing to generation.\nReturns:\n- List of suggested screens with descriptions\n- List of suggested images with descriptions\n- Total counts",
        "operationId": "analyze_prompt_analyze_prompt_post",
        "parameters": [
          {
            "name": "x-api-key",
            "in": "header",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "X-Api-Key"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AnalyzePromptRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/projects/{project_id}/activate": {
      "post": {
        "summary": "Activate Project",
        "description": "Activate an inactive project by starting its server and creating a tunnel\n\nThis endpoint allows users to reopen previously created projects",
        "operationId": "activate_project_projects__project_id__activate_post",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/projects/{project_id}/manual-activate": {
      "post": {
        "summary": "Manual Activate Project",
        "description": "Manually activate a project by providing the preview URL directly\n\nThis is useful when automated activation fails. You can:\n1. Manually start the Expo server (npx expo start --port XXXX)\n2. Manually create ngrok tunnel (ngrok http XXXX)\n3. Call this endpoint with the ngrok URL",
        "operationId": "manual_activate_project_projects__project_id__manual_activate_post",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ManualActivateRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/api/templates": {
      "get": {
        "summary": "Get Templates",
        "description": "Get all available UI templates\n\nReturns a list of all available color schemes and UI templates",
        "operationId": "get_templates_api_templates_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          }
        }
      }
    },
    "/templates": {
      "get": {
        "summary": "Get Templates",
        "description": "Get all available UI templates\n\nReturns a list of all available color schemes and UI templates",
        "operationId": "get_templates_templates_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          }
        }
      }
    },
    "/template-preview/{template_id}": {
      "get": {
        "summary": "Get Template Preview",
        "description": "Get HTML preview of a template\n\nReturns an HTML page showing the template with dummy data",
        "operationId": "get_template_preview_template_preview__template_id__get",
        "parameters": [
          {
            "name": "template_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Template Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/apply-template": {
      "post": {
        "summary": "Apply Template",
        "description": "Apply a UI template to an existing project\n\nUpdates all code files with the selected template's colors and styles",
        "operationId": "apply_template_apply_template_post",
        "parameters": [
          {
            "name": "x-api-key",
            "in": "header",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "X-Api-Key"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApplyTemplateRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/health": {
      "get": {
        "summary": "Health Check",
        "description": "Health check endpoint for load balancers\n\nReturns basic health status and optionally system metrics.\nThis endpoint should respond quickly (\u003C 2 seconds) for load balancer health checks.",
        "operationId": "health_check_health_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HealthResponse"
                }
              }
            }
          }
        }
      }
    },
    "/metrics": {
      "get": {
        "summary": "Get Metrics",
        "description": "Prometheus-compatible metrics endpoint\n\nReturns detailed system metrics including:\n- CPU usage\n- Memory usage\n- Disk usage\n- Active projects count\n- Total projects created\n- Average generation time",
        "operationId": "get_metrics_metrics_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MetricsResponse"
                }
              }
            }
          }
        }
      }
    },
    "/chat/edit": {
      "post": {
        "summary": "Chat Edit",
        "description": "AI-powered file editing through chat\n\nThis endpoint allows users to describe changes they want to make,\nand the AI will analyze the project and update the relevant files.",
        "operationId": "chat_edit_chat_edit_post",
        "parameters": [
          {
            "name": "x-api-key",
            "in": "header",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "X-Api-Key"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ChatEditRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ChatEditResponse"
                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/files/{project_id}/{file_path}/content": {
      "get": {
        "summary": "Get File Content",
        "description": "Get file content",
        "operationId": "get_file_content_files__project_id___file_path__content_get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          },
          {
            "name": "file_path",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "File Path"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/files/{project_id}/{file_path}": {
      "get": {
        "summary": "Serve File",
        "description": "Serve raw file (for images, etc.)",
        "operationId": "serve_file_files__project_id___file_path__get",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          },
          {
            "name": "file_path",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "File Path"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "put": {
        "summary": "Update File",
        "description": "Update file - automatically generates icons and images if it's a screen file",
        "operationId": "update_file_files__project_id___file_path__put",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          },
          {
            "name": "file_path",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "File Path"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FileContentRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Delete File",
        "description": "Delete file",
        "operationId": "delete_file_files__project_id___file_path__delete",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          },
          {
            "name": "file_path",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "File Path"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/files/{project_id}/{file_path}/rename": {
      "post": {
        "summary": "Rename File",
        "description": "Rename file",
        "operationId": "rename_file_files__project_id___file_path__rename_post",
        "parameters": [
          {
            "name": "project_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Project Id"
            }
          },
          {
            "name": "file_path",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "File Path"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FileRenameRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/generate-screen": {
      "post": {
        "summary": "Generate Screen",
        "description": "Generate new screen/component files based on prompt",
        "operationId": "generate_screen_generate_screen_post",
        "parameters": [
          {
            "name": "x-api-key",
            "in": "header",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "X-Api-Key"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GenerateScreenRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/generate-image": {
      "post": {
        "summary": "Generate Image",
        "description": "Generate image using AI with Gemini/OpenAI fallback",
        "operationId": "generate_image_generate_image_post",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ImageGenerateRequest"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "AnalyzePromptRequest": {
        "properties": {
          "prompt": {
            "type": "string",
            "maxLength": 5000,
            "minLength": 10,
            "title": "Prompt",
            "description": "Natural language description of the app"
          }
        },
        "type": "object",
        "required": [
          "prompt"
        ],
        "title": "AnalyzePromptRequest",
        "description": "Request model for /analyze-prompt endpoint"
      },
      "ApplyTemplateRequest": {
        "properties": {
          "project_id": {
            "type": "string",
            "title": "Project Id"
          },
          "template_id": {
            "type": "string",
            "title": "Template Id"
          }
        },
        "type": "object",
        "required": [
          "project_id",
          "template_id"
        ],
        "title": "ApplyTemplateRequest",
        "description": "Request model for applying template to existing project"
      },
      "BucketProjectInfo": {
        "properties": {
          "project_id": {
            "type": "string",
            "title": "Project Id"
          },
          "file_name": {
            "type": "string",
            "title": "File Name"
          },
          "size_mb": {
            "type": "number",
            "title": "Size Mb"
          },
          "created_at": {
            "type": "string",
            "title": "Created At"
          },
          "updated_at": {
            "type": "string",
            "title": "Updated At"
          },
          "gcs_path": {
            "type": "string",
            "title": "Gcs Path"
          },
          "download_url": {
            "type": "string",
            "title": "Download Url"
          }
        },
        "type": "object",
        "required": [
          "project_id",
          "file_name",
          "size_mb",
          "created_at",
          "updated_at",
          "gcs_path",
          "download_url"
        ],
        "title": "BucketProjectInfo",
        "description": "Information about a project in Cloud Storage"
      },
      "BucketProjectsResponse": {
        "properties": {
          "total_projects": {
            "type": "integer",
            "title": "Total Projects"
          },
          "total_size_mb": {
            "type": "number",
            "title": "Total Size Mb"
          },
          "projects": {
            "items": {
              "$ref": "#/components/schemas/BucketProjectInfo"
            },
            "type": "array",
            "title": "Projects"
          },
          "bucket_name": {
            "type": "string",
            "title": "Bucket Name"
          }
        },
        "type": "object",
        "required": [
          "total_projects",
          "total_size_mb",
          "projects",
          "bucket_name"
        ],
        "title": "BucketProjectsResponse",
        "description": "Response for listing bucket projects"
      },
      "ChatEditRequest": {
        "properties": {
          "project_id": {
            "type": "string",
            "title": "Project Id",
            "description": "Project ID to edit"
          },
          "prompt": {
            "type": "string",
            "maxLength": 2000,
            "minLength": 10,
            "title": "Prompt",
            "description": "Natural language instruction for editing"
          }
        },
        "type": "object",
        "required": [
          "project_id",
          "prompt"
        ],
        "title": "ChatEditRequest",
        "description": "Request model for /chat/edit endpoint"
      },
      "ChatEditResponse": {
        "properties": {
          "success": {
            "type": "boolean",
            "title": "Success"
          },
          "message": {
            "type": "string",
            "title": "Message"
          },
          "files_modified": {
            "items": {
              "type": "string"
            },
            "type": "array",
            "title": "Files Modified"
          },
          "changes_summary": {
            "type": "string",
            "title": "Changes Summary"
          }
        },
        "type": "object",
        "required": [
          "success",
          "message",
          "files_modified",
          "changes_summary"
        ],
        "title": "ChatEditResponse",
        "description": "Response model for /chat/edit endpoint"
      },
      "FastGenerateRequest": {
        "properties": {
          "prompt": {
            "type": "string",
            "maxLength": 5000,
            "minLength": 10,
            "title": "Prompt"
          },
          "user_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "User Id",
            "default": "anonymous"
          },
          "template_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Template Id"
          }
        },
        "type": "object",
        "required": [
          "prompt"
        ],
        "title": "FastGenerateRequest",
        "description": "Request model for fast generation"
      },
      "FastGenerateResponse": {
        "properties": {
          "project_id": {
            "type": "string",
            "title": "Project Id"
          },
          "status": {
            "type": "string",
            "title": "Status"
          },
          "message": {
            "type": "string",
            "title": "Message"
          },
          "websocket_url": {
            "type": "string",
            "title": "Websocket Url"
          }
        },
        "type": "object",
        "required": [
          "project_id",
          "status",
          "message",
          "websocket_url"
        ],
        "title": "FastGenerateResponse",
        "description": "Response model for fast generation"
      },
      "FileContentRequest": {
        "properties": {
          "content": {
            "type": "string",
            "title": "Content"
          }
        },
        "type": "object",
        "required": [
          "content"
        ],
        "title": "FileContentRequest"
      },
      "FileCreateRequest": {
        "properties": {
          "path": {
            "type": "string",
            "title": "Path"
          },
          "type": {
            "type": "string",
            "title": "Type"
          },
          "content": {
            "type": "string",
            "title": "Content",
            "default": ""
          }
        },
        "type": "object",
        "required": [
          "path",
          "type"
        ],
        "title": "FileCreateRequest"
      },
      "FileRenameRequest": {
        "properties": {
          "new_name": {
            "type": "string",
            "title": "New Name"
          }
        },
        "type": "object",
        "required": [
          "new_name"
        ],
        "title": "FileRenameRequest"
      },
      "GenerateRequest": {
        "properties": {
          "prompt": {
            "type": "string",
            "maxLength": 5000,
            "minLength": 10,
            "title": "Prompt",
            "description": "Natural language description of the app"
          },
          "user_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "User Id",
            "description": "User identifier",
            "default": "anonymous"
          },
          "template_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Template Id",
            "description": "UI template ID to apply"
          }
        },
        "type": "object",
        "required": [
          "prompt"
        ],
        "title": "GenerateRequest",
        "description": "Request model for /generate endpoint"
      },
      "GenerateResponse": {
        "properties": {
          "project_id": {
            "type": "string",
            "title": "Project Id"
          },
          "preview_url": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Preview Url"
          },
          "status": {
            "type": "string",
            "title": "Status"
          },
          "message": {
            "type": "string",
            "title": "Message"
          },
          "created_at": {
            "type": "string",
            "title": "Created At"
          }
        },
        "type": "object",
        "required": [
          "project_id",
          "status",
          "message",
          "created_at"
        ],
        "title": "GenerateResponse",
        "description": "Response model for /generate endpoint"
      },
      "GenerateScreenRequest": {
        "properties": {
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "project_id": {
            "type": "string",
            "title": "Project Id"
          }
        },
        "type": "object",
        "required": [
          "prompt",
          "project_id"
        ],
        "title": "GenerateScreenRequest"
      },
      "HTTPValidationError": {
        "properties": {
          "detail": {
            "items": {
              "$ref": "#/components/schemas/ValidationError"
            },
            "type": "array",
            "title": "Detail"
          }
        },
        "type": "object",
        "title": "HTTPValidationError"
      },
      "HealthResponse": {
        "properties": {
          "status": {
            "type": "string",
            "title": "Status"
          },
          "timestamp": {
            "type": "string",
            "title": "Timestamp"
          },
          "active_projects": {
            "type": "integer",
            "title": "Active Projects"
          },
          "system_metrics": {
            "anyOf": [
              {
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "title": "System Metrics"
          }
        },
        "type": "object",
        "required": [
          "status",
          "timestamp",
          "active_projects"
        ],
        "title": "HealthResponse",
        "description": "Response model for /health endpoint"
      },
      "ImageGenerateRequest": {
        "properties": {
          "prompt": {
            "type": "string",
            "title": "Prompt"
          },
          "project_id": {
            "type": "string",
            "title": "Project Id"
          }
        },
        "type": "object",
        "required": [
          "prompt",
          "project_id"
        ],
        "title": "ImageGenerateRequest"
      },
      "LogEntryResponse": {
        "properties": {
          "timestamp": {
            "type": "string",
            "title": "Timestamp"
          },
          "severity": {
            "type": "string",
            "title": "Severity"
          },
          "message": {
            "type": "string",
            "title": "Message"
          },
          "resource_type": {
            "type": "string",
            "title": "Resource Type"
          },
          "labels": {
            "type": "object",
            "title": "Labels"
          }
        },
        "type": "object",
        "required": [
          "timestamp",
          "severity",
          "message",
          "resource_type",
          "labels"
        ],
        "title": "LogEntryResponse",
        "description": "Response model for a single log entry"
      },
      "ManualActivateRequest": {
        "properties": {
          "preview_url": {
            "type": "string",
            "title": "Preview Url",
            "description": "Manually provided preview URL (ngrok or other)"
          }
        },
        "type": "object",
        "required": [
          "preview_url"
        ],
        "title": "ManualActivateRequest",
        "description": "Request model for manual activation"
      },
      "MetricsResponse": {
        "properties": {
          "cpu_percent": {
            "type": "number",
            "title": "Cpu Percent"
          },
          "memory_percent": {
            "type": "number",
            "title": "Memory Percent"
          },
          "disk_percent": {
            "type": "number",
            "title": "Disk Percent"
          },
          "active_projects": {
            "type": "integer",
            "title": "Active Projects"
          },
          "total_projects_created": {
            "type": "integer",
            "title": "Total Projects Created"
          },
          "average_generation_time": {
            "type": "number",
            "title": "Average Generation Time"
          }
        },
        "type": "object",
        "required": [
          "cpu_percent",
          "memory_percent",
          "disk_percent",
          "active_projects",
          "total_projects_created",
          "average_generation_time"
        ],
        "title": "MetricsResponse",
        "description": "Response model for /metrics endpoint"
      },
      "ProjectLogsResponse": {
        "properties": {
          "project_id": {
            "type": "string",
            "title": "Project Id"
          },
          "total_logs": {
            "type": "integer",
            "title": "Total Logs"
          },
          "logs": {
            "items": {
              "$ref": "#/components/schemas/LogEntryResponse"
            },
            "type": "array",
            "title": "Logs"
          },
          "time_range_hours": {
            "type": "integer",
            "title": "Time Range Hours"
          },
          "cloud_logging_enabled": {
            "type": "boolean",
            "title": "Cloud Logging Enabled"
          }
        },
        "type": "object",
        "required": [
          "project_id",
          "total_logs",
          "logs",
          "time_range_hours",
          "cloud_logging_enabled"
        ],
        "title": "ProjectLogsResponse",
        "description": "Response model for /logs/{project_id} endpoint"
      },
      "StreamingGenerateRequest": {
        "properties": {
          "prompt": {
            "type": "string",
            "maxLength": 5000,
            "minLength": 10,
            "title": "Prompt"
          },
          "user_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "User Id",
            "default": "anonymous"
          },
          "template_id": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Template Id"
          },
          "fast_mode": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "title": "Fast Mode",
            "description": "Skip additional screens for faster preview",
            "default": false
          }
        },
        "type": "object",
        "required": [
          "prompt"
        ],
        "title": "StreamingGenerateRequest",
        "description": "Request model for streaming generation"
      },
      "StreamingGenerateResponse": {
        "properties": {
          "project_id": {
            "type": "string",
            "title": "Project Id"
          },
          "websocket_url": {
            "type": "string",
            "title": "Websocket Url"
          },
          "message": {
            "type": "string",
            "title": "Message"
          }
        },
        "type": "object",
        "required": [
          "project_id",
          "websocket_url",
          "message"
        ],
        "title": "StreamingGenerateResponse",
        "description": "Response model for streaming generation"
      },
      "ValidationError": {
        "properties": {
          "loc": {
            "items": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "integer"
                }
              ]
            },
            "type": "array",
            "title": "Location"
          },
          "msg": {
            "type": "string",
            "title": "Message"
          },
          "type": {
            "type": "string",
            "title": "Error Type"
          }
        },
        "type": "object",
        "required": [
          "loc",
          "msg",
          "type"
        ],
        "title": "ValidationError"
      },
      "endpoints__project_endpoints__ProjectStatusResponse": {
        "properties": {
          "project_id": {
            "type": "string",
            "title": "Project Id"
          },
          "status": {
            "type": "string",
            "title": "Status"
          },
          "preview_url": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Preview Url"
          },
          "error": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Error"
          },
          "exists": {
            "type": "boolean",
            "title": "Exists"
          }
        },
        "type": "object",
        "required": [
          "project_id",
          "status",
          "exists"
        ],
        "title": "ProjectStatusResponse",
        "description": "Simple project status response"
      },
      "main__ProjectStatusResponse": {
        "properties": {
          "project_id": {
            "type": "string",
            "title": "Project Id"
          },
          "status": {
            "type": "string",
            "title": "Status"
          },
          "preview_url": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Preview Url"
          },
          "error": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Error"
          },
          "created_at": {
            "type": "string",
            "title": "Created At"
          },
          "last_active": {
            "type": "string",
            "title": "Last Active"
          }
        },
        "type": "object",
        "required": [
          "project_id",
          "status",
          "created_at",
          "last_active"
        ],
        "title": "ProjectStatusResponse",
        "description": "Response model for /status endpoint"
      }
    }
  }
}
```
