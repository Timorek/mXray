import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { listTestSets } from './listTestSets.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

describe('listTestSets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns test sets for a project', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        total: 1,
        issues: [
          { key: 'PROJ-300', fields: { summary: 'Smoke Tests', status: { name: 'Open' }, assignee: null, created: '2026-01-01' } },
        ],
      },
    });

    const result = await listTestSets(mockJiraClient, { project_key: 'PROJ' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.total).toBe(1);
    expect(parsed.sets[0].key).toBe('PROJ-300');
  });

  it('uses correct JQL', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { total: 0, issues: [] } });

    await listTestSets(mockJiraClient, { project_key: 'PROJ' });

    const call = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].jql).toContain('issuetype = "Test Set"');
  });
});
