import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { XrayCloudService } from './XrayCloudService.js';
import type { Config } from '../types.js';

// Mock axios
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        post: vi.fn(),
        get: vi.fn(),
      })),
      post: vi.fn(),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

const validConfig: Config = {
  JIRA_BASE_URL: 'https://test.atlassian.net',
  JIRA_EMAIL: 'test@test.com',
  JIRA_API_TOKEN: 'token',
  XRAY_CLIENT_ID: 'client-id',
  XRAY_CLIENT_SECRET: 'client-secret',
};

describe('XrayCloudService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    XrayCloudService.resetInstance();
  });

  afterEach(() => {
    XrayCloudService.resetInstance();
  });

  describe('isConfigured', () => {
    it('returns true when both credentials are present', () => {
      expect(XrayCloudService.isConfigured(validConfig)).toBe(true);
    });

    it('returns false when credentials are missing', () => {
      expect(XrayCloudService.isConfigured({
        JIRA_BASE_URL: 'https://test.atlassian.net',
        JIRA_EMAIL: 'test@test.com',
        JIRA_API_TOKEN: 'token',
      })).toBe(false);
    });

    it('returns false when only client id is present', () => {
      expect(XrayCloudService.isConfigured({
        ...validConfig,
        XRAY_CLIENT_SECRET: undefined,
      })).toBe(false);
    });
  });

  describe('getInstance', () => {
    it('returns same instance on subsequent calls', () => {
      const instance1 = XrayCloudService.getInstance(validConfig);
      const instance2 = XrayCloudService.getInstance(validConfig);
      expect(instance1).toBe(instance2);
    });

    it('throws when credentials are missing', () => {
      expect(() => XrayCloudService.getInstance({
        JIRA_BASE_URL: 'https://test.atlassian.net',
        JIRA_EMAIL: 'test@test.com',
        JIRA_API_TOKEN: 'token',
      })).toThrow('Xray credentials not configured');
    });
  });

  describe('authenticate', () => {
    it('fetches a new token', async () => {
      const service = XrayCloudService.getInstance(validConfig);
      const mockHttpClient = (axios.create as ReturnType<typeof vi.fn>).mock.results[0].value;
      (mockHttpClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'jwt-token-123' });

      const token = await service.authenticate();

      expect(token).toBe('jwt-token-123');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/authenticate',
        { client_id: 'client-id', client_secret: 'client-secret' },
      );
    });

    it('returns cached token on subsequent calls', async () => {
      const service = XrayCloudService.getInstance(validConfig);
      const mockHttpClient = (axios.create as ReturnType<typeof vi.fn>).mock.results[0].value;
      (mockHttpClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'jwt-token-123' });

      await service.authenticate();
      await service.authenticate();

      // Only one POST to /authenticate (first call), second uses cache
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('token invalidation on 401', () => {
    it('invalidates token on 401 and re-authenticates on next call', async () => {
      const service = XrayCloudService.getInstance(validConfig);
      const mockHttpClient = (axios.create as ReturnType<typeof vi.fn>).mock.results[0].value;

      // Setup: get initial token
      (mockHttpClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: 'token-1' });
      await service.authenticate();
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // Simulate a 401 error from httpClient during a GraphQL call
      const axiosError = new Error('Unauthorized') as any;
      axiosError.response = { status: 401, data: 'Unauthorized' };
      axiosError.isAxiosError = true;

      (mockHttpClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(axiosError);

      // The GraphQL call should throw (triggering token invalidation)
      try {
        await service.getTest('PROJ-1');
      } catch {
        // expected to throw
      }

      // Now authenticate again — should fetch a new token (not use cache)
      (mockHttpClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: 'token-2' });
      const newToken = await service.authenticate();

      expect(newToken).toBe('token-2');
      // post calls: 1 (initial auth) + 1 (graphql that 401'd) + 1 (re-auth) = 3
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });
  });
});
