import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { getTestWithSteps } from './getTestWithSteps.js';

const mockXrayService = {
  getTestWithSteps: vi.fn(),
} as unknown as XrayCloudService;

describe('getTestWithSteps', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await getTestWithSteps(null, { test_key: 'PROJ-1' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('returns test with steps', async () => {
    (mockXrayService.getTestWithSteps as ReturnType<typeof vi.fn>).mockResolvedValue({
      issueId: '10001',
      testType: { name: 'Manual', kind: 'Manual' },
      steps: [{ id: '1', action: 'Click login', data: '', result: 'Logged in' }],
      jira: { key: 'PROJ-1', summary: 'Login test' },
    });

    const result = await getTestWithSteps(mockXrayService, { test_key: 'PROJ-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.issueId).toBe('10001');
    expect(parsed.steps).toHaveLength(1);
    expect(mockXrayService.getTestWithSteps).toHaveBeenCalledWith('PROJ-1');
  });

  it('returns not found message when test does not exist', async () => {
    (mockXrayService.getTestWithSteps as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getTestWithSteps(mockXrayService, { test_key: 'PROJ-999' });
    expect(result.content[0].text).toContain('not found');
  });
});
