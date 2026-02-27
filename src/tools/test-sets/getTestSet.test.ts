import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { getTestSet } from './getTestSet.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  getTestSet: vi.fn(),
} as unknown as XrayCloudService;

const jiraIssueData = {
  key: 'PROJ-300',
  id: '10300',
  fields: {
    summary: 'Smoke Tests',
    description: null,
    status: { name: 'Open' },
    issuetype: { name: 'Test Set' },
    labels: [],
    components: [],
    assignee: null,
    reporter: null,
    created: '2026-01-01',
    updated: '2026-01-02',
  },
};

describe('getTestSet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns set details without xray', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: jiraIssueData });

    const result = await getTestSet(mockJiraClient, null, { set_key: 'PROJ-300' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.key).toBe('PROJ-300');
    expect(parsed.tests).toBeUndefined();
  });

  it('enriches with xray data when available', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: jiraIssueData });
    (mockXrayService.getTestSet as ReturnType<typeof vi.fn>).mockResolvedValue({ tests: { total: 3 } });

    const result = await getTestSet(mockJiraClient, mockXrayService, { set_key: 'PROJ-300' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.tests).toBeDefined();
  });

  it('returns jira data when xray service throws (graceful fallback)', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: jiraIssueData });
    (mockXrayService.getTestSet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Xray unavailable'));

    const result = await getTestSet(mockJiraClient, mockXrayService, { set_key: 'PROJ-300' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.key).toBe('PROJ-300');
    expect(parsed.summary).toBe('Smoke Tests');
    expect(parsed.tests).toBeUndefined();
  });
});
