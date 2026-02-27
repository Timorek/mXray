import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { listTests } from './listTests.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

describe('listTests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns tests for a project', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        total: 2,
        issues: [
          { key: 'PROJ-1', fields: { summary: 'Test 1', status: { name: 'Open' }, labels: ['smoke'], components: [{ name: 'Auth' }] } },
          { key: 'PROJ-2', fields: { summary: 'Test 2', status: { name: 'Done' }, labels: [], components: [] } },
        ],
      },
    });

    const result = await listTests(mockJiraClient, { project_key: 'PROJ' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.total).toBe(2);
    expect(parsed.tests).toHaveLength(2);
    expect(parsed.tests[0].key).toBe('PROJ-1');
    expect(parsed.tests[0].labels).toEqual(['smoke']);
    expect(parsed.tests[0].components).toEqual(['Auth']);
  });

  it('builds JQL with label and component filters', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { total: 0, issues: [] },
    });

    await listTests(mockJiraClient, {
      project_key: 'PROJ',
      labels: ['smoke', 'regression'],
      component: 'API',
      max_results: 10,
    });

    const call = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('/search/jql');
    expect(call[1].jql).toContain('labels IN ("smoke", "regression")');
    expect(call[1].jql).toContain('component = "API"');
    expect(call[1].maxResults).toBe(10);
  });

  it('defaults max_results to 50', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { total: 0, issues: [] },
    });

    await listTests(mockJiraClient, { project_key: 'PROJ' });

    const call = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].maxResults).toBe(50);
  });
});
