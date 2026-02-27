import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { updateGherkinTestDefinition } from './updateGherkinTestDefinition.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  updateGherkinTestDefinition: vi.fn(),
} as unknown as XrayCloudService;

describe('updateGherkinTestDefinition', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await updateGherkinTestDefinition(mockJiraClient, null, { test_key: 'PROJ-1', gherkin: 'Given...' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('resolves issue ID and updates gherkin', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: '10001' } });
    (mockXrayService.updateGherkinTestDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const gherkin = 'Scenario: Login\n  Given I am on the login page';
    const result = await updateGherkinTestDefinition(mockJiraClient, mockXrayService, { test_key: 'PROJ-1', gherkin });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.success).toBe(true);
    expect(mockXrayService.updateGherkinTestDefinition).toHaveBeenCalledWith('10001', gherkin);
  });

  it('handles API errors', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await updateGherkinTestDefinition(mockJiraClient, mockXrayService, { test_key: 'X', gherkin: '' });
    expect(result.content[0].text).toContain('Error updating Gherkin definition');
  });
});
