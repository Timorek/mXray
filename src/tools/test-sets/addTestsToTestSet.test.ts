import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { addTestsToTestSet } from './addTestsToTestSet.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  addTestsToTestSet: vi.fn(),
} as unknown as XrayCloudService;

describe('addTestsToTestSet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await addTestsToTestSet(mockJiraClient, null, { set_key: 'PROJ-300', test_keys: ['PROJ-1'] });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('resolves keys and adds tests', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { id: '10300' } })
      .mockResolvedValueOnce({ data: { id: '10001' } });
    (mockXrayService.addTestsToTestSet as ReturnType<typeof vi.fn>).mockResolvedValue({ addedTests: ['10001'] });

    const result = await addTestsToTestSet(mockJiraClient, mockXrayService, {
      set_key: 'PROJ-300',
      test_keys: ['PROJ-1'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(mockXrayService.addTestsToTestSet).toHaveBeenCalledWith('10300', ['10001']);
  });

  it('handles errors', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await addTestsToTestSet(mockJiraClient, mockXrayService, {
      set_key: 'PROJ-999',
      test_keys: ['PROJ-1'],
    });

    expect(result.content[0].text).toContain('Error adding tests to test set');
  });
});
