import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { getTestExecution } from './getTestExecution.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  getTestExecution: vi.fn(),
} as unknown as XrayCloudService;

const jiraIssueData = {
  key: 'PROJ-100',
  id: '10100',
  fields: {
    summary: 'Exec 1',
    description: null,
    status: { name: 'Open' },
    issuetype: { name: 'Test Execution' },
    labels: [],
    components: [],
    assignee: null,
    reporter: null,
    created: '2026-01-01',
    updated: '2026-01-02',
  },
};

describe('getTestExecution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns execution details without xray', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: jiraIssueData });

    const result = await getTestExecution(mockJiraClient, null, { execution_key: 'PROJ-100' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.key).toBe('PROJ-100');
    expect(parsed.testRuns).toBeUndefined();
  });

  it('enriches with xray test runs when available', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: jiraIssueData });
    (mockXrayService.getTestExecution as ReturnType<typeof vi.fn>).mockResolvedValue({ tests: { total: 1 } });

    const result = await getTestExecution(mockJiraClient, mockXrayService, { execution_key: 'PROJ-100' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.testRuns).toBeDefined();
  });

  it('returns jira data only when xray fails', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: jiraIssueData });
    (mockXrayService.getTestExecution as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await getTestExecution(mockJiraClient, mockXrayService, { execution_key: 'PROJ-100' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.key).toBe('PROJ-100');
    expect(parsed.testRuns).toBeUndefined();
  });
});
