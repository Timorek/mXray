import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { createTestSet } from './createTestSet.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

describe('createTestSet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a test set', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-400', id: '10400', self: 'https://jira/issue/10400' },
    });

    const result = await createTestSet(mockJiraClient, {
      project_key: 'PROJ',
      summary: 'Smoke Tests',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-400');

    const fields = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0][1].fields;
    expect(fields.issuetype.name).toBe('Test Set');
  });

  it('includes description as ADF', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-401', id: '10401', self: '' },
    });

    await createTestSet(mockJiraClient, {
      project_key: 'PROJ',
      summary: 'Set',
      description: 'My test set',
    });

    const fields = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0][1].fields;
    expect(fields.description.type).toBe('doc');
  });
});
