import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { listTestPlans } from './listTestPlans.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

describe('listTestPlans', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns plans for a project', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        total: 1,
        issues: [
          { key: 'PROJ-50', fields: { summary: 'Release Plan', status: { name: 'Active' }, assignee: null, created: '2026-01-01' } },
        ],
      },
    });

    const result = await listTestPlans(mockJiraClient, { project_key: 'PROJ' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.total).toBe(1);
    expect(parsed.plans[0].key).toBe('PROJ-50');
  });

  it('uses correct JQL', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { total: 0, issues: [] } });

    await listTestPlans(mockJiraClient, { project_key: 'PROJ' });

    const call = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].jql).toContain('issuetype = "Test Plan"');
  });
});
