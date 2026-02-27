import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { getTest } from './getTest.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

describe('getTest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns test details', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        key: 'PROJ-1',
        id: '10001',
        fields: {
          summary: 'Login test',
          description: null,
          status: { name: 'Open' },
          issuetype: { name: 'Test' },
          labels: ['smoke'],
          components: [{ name: 'Auth' }],
          assignee: { displayName: 'John' },
          reporter: { displayName: 'Jane' },
          created: '2026-01-01',
          updated: '2026-01-02',
        },
      },
    });

    const result = await getTest(mockJiraClient, { test_key: 'PROJ-1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.key).toBe('PROJ-1');
    expect(parsed.summary).toBe('Login test');
    expect(parsed.assignee).toBe('John');
    expect(parsed.components).toEqual(['Auth']);
    expect(mockJiraClient.get).toHaveBeenCalledWith('/issue/PROJ-1');
  });

  it('handles null assignee/reporter', async () => {
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        key: 'PROJ-2',
        id: '10002',
        fields: {
          summary: 'Test',
          status: { name: 'Open' },
          issuetype: { name: 'Test' },
          labels: [],
          components: [],
          assignee: null,
          reporter: null,
        },
      },
    });

    const result = await getTest(mockJiraClient, { test_key: 'PROJ-2' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.assignee).toBeNull();
    expect(parsed.reporter).toBeNull();
  });
});
