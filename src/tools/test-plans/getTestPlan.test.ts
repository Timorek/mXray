import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { getTestPlan } from './getTestPlan.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  getTestPlan: vi.fn(),
} as unknown as XrayCloudService;

const jiraIssueData = {
  key: 'PROJ-50',
  id: '10050',
  fields: {
    summary: 'Release Plan',
    description: null,
    status: { name: 'Active' },
    issuetype: { name: 'Test Plan' },
    labels: [],
    components: [],
    assignee: null,
    reporter: null,
    created: '2026-01-01',
    updated: '2026-01-02',
  },
};

describe('getTestPlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns plan details without xray', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: jiraIssueData });

    const result = await getTestPlan(mockJiraClient, null, { plan_key: 'PROJ-50' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.key).toBe('PROJ-50');
    expect(parsed.tests).toBeUndefined();
  });

  it('enriches with xray test data when available', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: jiraIssueData });
    (mockXrayService.getTestPlan as ReturnType<typeof vi.fn>).mockResolvedValue({ tests: { total: 2 } });

    const result = await getTestPlan(mockJiraClient, mockXrayService, { plan_key: 'PROJ-50' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.tests).toBeDefined();
  });

  it('returns jira data when xray service throws (graceful fallback)', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: jiraIssueData });
    (mockXrayService.getTestPlan as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Xray unavailable'));

    const result = await getTestPlan(mockJiraClient, mockXrayService, { plan_key: 'PROJ-50' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.key).toBe('PROJ-50');
    expect(parsed.summary).toBe('Release Plan');
    expect(parsed.tests).toBeUndefined();
  });
});
