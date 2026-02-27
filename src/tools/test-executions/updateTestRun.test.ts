import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { updateTestRun } from './updateTestRun.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  getTestRun: vi.fn(),
  updateTestRunStatus: vi.fn(),
  updateTestRunComment: vi.fn(),
} as unknown as XrayCloudService;

describe('updateTestRun', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await updateTestRun(mockJiraClient, null, {
      execution_key: 'PROJ-100',
      test_key: 'PROJ-1',
      status: 'PASSED',
    });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('updates test run status', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { id: '10100' } })
      .mockResolvedValueOnce({ data: { id: '10001' } });
    (mockXrayService.getTestRun as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'run-1', status: { name: 'TODO' } });
    (mockXrayService.updateTestRunStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await updateTestRun(mockJiraClient, mockXrayService, {
      execution_key: 'PROJ-100',
      test_key: 'PROJ-1',
      status: 'PASSED',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.status).toBe('PASSED');
    expect(mockXrayService.updateTestRunStatus).toHaveBeenCalledWith('run-1', 'PASSED');
  });

  it('adds comment when provided', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { id: '10100' } })
      .mockResolvedValueOnce({ data: { id: '10001' } });
    (mockXrayService.getTestRun as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'run-1', status: { name: 'TODO' } });
    (mockXrayService.updateTestRunStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockXrayService.updateTestRunComment as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await updateTestRun(mockJiraClient, mockXrayService, {
      execution_key: 'PROJ-100',
      test_key: 'PROJ-1',
      status: 'FAILED',
      comment: 'Bug found',
    });

    expect(mockXrayService.updateTestRunComment).toHaveBeenCalledWith('run-1', 'Bug found');
  });

  it('returns error when test run not found', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { id: '10100' } })
      .mockResolvedValueOnce({ data: { id: '10001' } });
    (mockXrayService.getTestRun as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await updateTestRun(mockJiraClient, mockXrayService, {
      execution_key: 'PROJ-100',
      test_key: 'PROJ-1',
      status: 'PASSED',
    });

    expect(result.content[0].text).toContain('No test run found');
  });
});
