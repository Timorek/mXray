import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { updateTestType } from './updateTestType.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  updateTestType: vi.fn(),
} as unknown as XrayCloudService;

describe('updateTestType', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await updateTestType(mockJiraClient, null, { test_key: 'PROJ-1', test_type: 'Manual' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('resolves issue ID and calls xray service', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: '10001' } });
    (mockXrayService.updateTestType as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await updateTestType(mockJiraClient, mockXrayService, { test_key: 'PROJ-1', test_type: 'Cucumber' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.success).toBe(true);
    expect(parsed.test_type).toBe('Cucumber');
    expect(mockXrayService.updateTestType).toHaveBeenCalledWith('10001', 'Cucumber');
  });

  it('handles API errors', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'));

    const result = await updateTestType(mockJiraClient, mockXrayService, { test_key: 'PROJ-999', test_type: 'Manual' });
    expect(result.content[0].text).toContain('Error updating test type');
  });
});
