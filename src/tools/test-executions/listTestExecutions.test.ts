import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { listTestExecutions } from './listTestExecutions.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

describe('listTestExecutions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns executions for a project', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        total: 1,
        issues: [
          { key: 'PROJ-100', fields: { summary: 'Sprint 1 Exec', status: { name: 'In Progress' }, assignee: { displayName: 'John' }, created: '2026-01-01' } },
        ],
      },
    });

    const result = await listTestExecutions(mockJiraClient, { project_key: 'PROJ' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.total).toBe(1);
    expect(parsed.executions[0].key).toBe('PROJ-100');
    expect(parsed.executions[0].assignee).toBe('John');
  });

  it('uses correct JQL for test executions', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { total: 0, issues: [] } });

    await listTestExecutions(mockJiraClient, { project_key: 'PROJ', max_results: 10 });

    const call = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].jql).toContain('issuetype = "Test Execution"');
    expect(call[1].maxResults).toBe(10);
  });
});
