import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { createTestPlan } from './createTestPlan.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

describe('createTestPlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a test plan', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-50', id: '10050', self: 'https://jira/issue/10050' },
    });

    const result = await createTestPlan(mockJiraClient, {
      project_key: 'PROJ',
      summary: 'Release Plan',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-50');

    const fields = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0][1].fields;
    expect(fields.issuetype.name).toBe('Test Plan');
  });

  it('includes description as ADF', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-51', id: '10051', self: '' },
    });

    await createTestPlan(mockJiraClient, {
      project_key: 'PROJ',
      summary: 'Plan',
      description: 'My plan',
    });

    const fields = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0][1].fields;
    expect(fields.description.type).toBe('doc');
  });
});
