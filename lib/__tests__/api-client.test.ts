import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { APIClient, GenerateRequest, ProjectStatus } from '../api-client';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('APIClient', () => {
  let client: APIClient;
  let mockCreate: any;

  beforeEach(() => {
    // Setup axios.create mock
    mockCreate = {
      post: vi.fn(),
      get: vi.fn(),
    };
    mockedAxios.create = vi.fn(() => mockCreate);
    
    // Mock isAxiosError to check for isAxiosError property
    mockedAxios.isAxiosError = vi.fn((error: any): error is AxiosError => {
      return error && error.isAxiosError === true;
    }) as any;

    client = new APIClient('http://test-api.com');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generate', () => {
    it('should successfully generate an app', async () => {
      const request: GenerateRequest = { prompt: 'Create a todo app' };
      const mockResponse = {
        data: {
          project_id: 'test-project-123',
          status: 'success',
        },
      };

      mockCreate.post.mockResolvedValueOnce(mockResponse);

      const result = await client.generate(request);

      expect(mockCreate.post).toHaveBeenCalledWith('/generate', request);
      expect(result.project_id).toBe('test-project-123');
      expect(result.status).toBe('success');
    });

    it('should handle generation errors', async () => {
      const request: GenerateRequest = { prompt: 'Create an app' };
      const mockError = {
        isAxiosError: true,
        message: 'Request failed',
        response: {
          status: 500,
          data: {
            error: 'AI_GENERATION_ERROR',
            message: 'Failed to generate code',
            suggestion: 'Try rephrasing your prompt',
          },
        },
      };

      // Mock all 3 retry attempts
      mockCreate.post.mockRejectedValue(mockError);

      try {
        await client.generate(request);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Failed to generate code');
        expect(mockCreate.post).toHaveBeenCalledTimes(3); // Should retry 3 times for 500 error
      }
    });

    it('should retry on network errors', async () => {
      const request: GenerateRequest = { prompt: 'Create an app' };
      const networkError = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };
      const successResponse = {
        data: {
          project_id: 'test-project-123',
          status: 'success',
        },
      };

      // Fail first, succeed second
      mockCreate.post
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await client.generate(request);

      expect(mockCreate.post).toHaveBeenCalledTimes(2);
      expect(result.project_id).toBe('test-project-123');
    });

    it('should retry on 503 status code', async () => {
      const request: GenerateRequest = { prompt: 'Create an app' };
      const serviceUnavailable = {
        isAxiosError: true,
        message: 'Service unavailable',
        response: {
          status: 503,
          data: {
            error: 'SERVICE_UNAVAILABLE',
            message: 'Service temporarily unavailable',
          },
        },
      };
      const successResponse = {
        data: {
          project_id: 'test-project-123',
          status: 'success',
        },
      };

      mockCreate.post
        .mockRejectedValueOnce(serviceUnavailable)
        .mockResolvedValueOnce(successResponse);

      const result = await client.generate(request);

      expect(mockCreate.post).toHaveBeenCalledTimes(2);
      expect(result.project_id).toBe('test-project-123');
    });

    it('should not retry on 400 status code', async () => {
      const request: GenerateRequest = { prompt: '' };
      const badRequest = {
        isAxiosError: true,
        message: 'Bad request',
        response: {
          status: 400,
          data: {
            error: 'VALIDATION_ERROR',
            message: 'Prompt is required',
          },
        },
      };

      mockCreate.post.mockRejectedValueOnce(badRequest);

      await expect(client.generate(request)).rejects.toThrow();
      expect(mockCreate.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus', () => {
    it('should successfully get project status', async () => {
      const mockStatus: ProjectStatus = {
        id: 'test-project-123',
        status: 'generating_code',
        preview_url: null,
        error: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockCreate.get.mockResolvedValueOnce({ data: mockStatus });

      const result = await client.getStatus('test-project-123');

      expect(mockCreate.get).toHaveBeenCalledWith('/status/test-project-123');
      expect(result.id).toBe('test-project-123');
      expect(result.status).toBe('generating_code');
    });

    it('should handle status errors', async () => {
      const mockError = {
        isAxiosError: true,
        message: 'Not found',
        response: {
          status: 404,
          data: {
            error: 'NOT_FOUND',
            message: 'Project not found',
          },
        },
      };

      mockCreate.get.mockRejectedValueOnce(mockError);

      try {
        await client.getStatus('invalid-id');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Project not found');
      }
    });
  });

  describe('download', () => {
    it('should successfully download a project', async () => {
      const mockBlob = new Blob(['test content'], { type: 'application/zip' });
      mockCreate.get.mockResolvedValueOnce({ data: mockBlob });

      const result = await client.download('test-project-123');

      expect(mockCreate.get).toHaveBeenCalledWith('/download/test-project-123', {
        responseType: 'blob',
      });
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle download errors', async () => {
      const mockError = {
        isAxiosError: true,
        message: 'Not found',
        response: {
          status: 404,
          data: {
            error: 'NOT_FOUND',
            message: 'Project not found',
          },
        },
      };

      mockCreate.get.mockRejectedValueOnce(mockError);

      await expect(client.download('invalid-id')).rejects.toThrow();
    });
  });

  describe('pollStatus', () => {
    it('should poll until status is ready', async () => {
      const statuses: ProjectStatus[] = [
        {
          id: 'test-project-123',
          status: 'generating_code',
          preview_url: null,
          error: null,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'test-project-123',
          status: 'installing_deps',
          preview_url: null,
          error: null,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'test-project-123',
          status: 'ready',
          preview_url: 'https://example.com',
          error: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockCreate.get
        .mockResolvedValueOnce({ data: statuses[0] })
        .mockResolvedValueOnce({ data: statuses[1] })
        .mockResolvedValueOnce({ data: statuses[2] });

      const result = await client.pollStatus('test-project-123', {
        intervalMs: 10, // Fast polling for tests
      });

      expect(mockCreate.get).toHaveBeenCalledTimes(3);
      expect(result.status).toBe('ready');
      expect(result.preview_url).toBe('https://example.com');
    });

    it('should stop polling on error status', async () => {
      const errorStatus: ProjectStatus = {
        id: 'test-project-123',
        status: 'error',
        preview_url: null,
        error: 'Generation failed',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockCreate.get.mockResolvedValueOnce({ data: errorStatus });

      const result = await client.pollStatus('test-project-123', {
        intervalMs: 10,
      });

      expect(mockCreate.get).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('error');
      expect(result.error).toBe('Generation failed');
    });

    it('should call onStatusUpdate callback', async () => {
      const onStatusUpdate = vi.fn();
      const status: ProjectStatus = {
        id: 'test-project-123',
        status: 'ready',
        preview_url: 'https://example.com',
        error: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockCreate.get.mockResolvedValueOnce({ data: status });

      await client.pollStatus('test-project-123', {
        intervalMs: 10,
        onStatusUpdate,
      });

      expect(onStatusUpdate).toHaveBeenCalledWith(status);
    });

    it('should timeout after max attempts', async () => {
      const pendingStatus: ProjectStatus = {
        id: 'test-project-123',
        status: 'generating_code',
        preview_url: null,
        error: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockCreate.get.mockResolvedValue({ data: pendingStatus });

      await expect(
        client.pollStatus('test-project-123', {
          intervalMs: 10,
          maxAttempts: 3,
        })
      ).rejects.toThrow('Status polling timed out');

      expect(mockCreate.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateAndWait', () => {
    it('should generate and wait for completion', async () => {
      const request: GenerateRequest = { prompt: 'Create a todo app' };
      const generateResponse = {
        data: {
          project_id: 'test-project-123',
          status: 'success',
        },
      };
      const finalStatus: ProjectStatus = {
        id: 'test-project-123',
        status: 'ready',
        preview_url: 'https://example.com',
        error: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockCreate.post.mockResolvedValueOnce(generateResponse);
      mockCreate.get.mockResolvedValueOnce({ data: finalStatus });

      const result = await client.generateAndWait(request, {
        intervalMs: 10,
      });

      expect(mockCreate.post).toHaveBeenCalledWith('/generate', request);
      expect(result.status).toBe('ready');
      expect(result.preview_url).toBe('https://example.com');
    });

    it('should throw error if generation fails', async () => {
      const request: GenerateRequest = { prompt: 'Create an app' };
      const generateResponse = {
        data: {
          project_id: 'test-project-123',
          status: 'error',
          error: 'AI generation failed',
        },
      };

      mockCreate.post.mockResolvedValueOnce(generateResponse);

      await expect(
        client.generateAndWait(request, { intervalMs: 10 })
      ).rejects.toThrow('AI generation failed');
    });
  });

  describe('error handling', () => {
    it('should format connection refused errors', async () => {
      const request: GenerateRequest = { prompt: 'Create an app' };
      const connectionError = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      // Mock all retry attempts
      mockCreate.post.mockRejectedValue(connectionError);

      try {
        await client.generate(request);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Cannot connect to the backend server');
        expect(error.suggestion).toBe('Make sure the backend server is running');
        expect(mockCreate.post).toHaveBeenCalledTimes(3); // Should retry on network errors
      }
    });

    it('should format timeout errors', async () => {
      const request: GenerateRequest = { prompt: 'Create an app' };
      const timeoutError = {
        isAxiosError: true,
        code: 'ETIMEDOUT',
        message: 'Timeout',
      };

      // Mock all retry attempts
      mockCreate.post.mockRejectedValue(timeoutError);

      try {
        await client.generate(request);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Request timed out');
        expect(error.suggestion).toBe('The operation took too long. Please try again');
        expect(mockCreate.post).toHaveBeenCalledTimes(3); // Should retry on timeout
      }
    });

    it('should preserve error details from API', async () => {
      const request: GenerateRequest = { prompt: 'Create an app' };
      const apiError = {
        isAxiosError: true,
        message: 'API error',
        response: {
          status: 500,
          data: {
            error: 'AI_GENERATION_ERROR',
            message: 'OpenAI API failed',
            suggestion: 'Check your API key',
          },
        },
      };

      // Mock all retry attempts
      mockCreate.post.mockRejectedValue(apiError);

      try {
        await client.generate(request);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('OpenAI API failed');
        expect(error.suggestion).toBe('Check your API key');
        expect(error.errorType).toBe('AI_GENERATION_ERROR');
        expect(error.statusCode).toBe(500);
        expect(mockCreate.post).toHaveBeenCalledTimes(3); // Should retry on 500
      }
    });
  });
});
