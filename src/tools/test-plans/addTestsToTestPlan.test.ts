import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { addTestsToTestPlan } from './addTestsToTestPlan.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  addTestsToTestPlan: vi.fn(),
} as unknown as XrayCloudService;

describe('addTestsToTestPlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await addTestsToTestPlan(mockJiraClient, null, { plan_key: 'PROJ-50', test_keys: ['PROJ-1'] });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('resolves keys and adds tests', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { id: '10050' } }) // plan
      .mockResolvedValueOnce({ data: { id: '10001' } }) // test 1
      .mockResolvedValueOnce({ data: { id: '10002' } }); // test 2
    (mockXrayService.addTestsToTestPlan as ReturnType<typeof vi.fn>).mockResolvedValue({ addedTests: ['10001', '10002'] });

    const result = await addTestsToTestPlan(mockJiraClient, mockXrayService, {
      plan_key: 'PROJ-50',
      test_keys: ['PROJ-1', 'PROJ-2'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(mockXrayService.addTestsToTestPlan).toHaveBeenCalledWith('10050', ['10001', '10002']);
  });

  it('handles errors', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'));

    const result = await addTestsToTestPlan(mockJiraClient, mockXrayService, {
      plan_key: 'PROJ-999',
      test_keys: ['PROJ-1'],
    });

    expect(result.content[0].text).toContain('Error adding tests to test plan');
  });
});
