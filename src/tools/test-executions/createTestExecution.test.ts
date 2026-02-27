import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { createTestExecution } from './createTestExecution.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  addTestsToTestExecution: vi.fn(),
} as unknown as XrayCloudService;

describe('createTestExecution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a basic execution', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-200', id: '10200', self: 'https://jira/issue/10200' },
    });

    const result = await createTestExecution(mockJiraClient, null, {
      project_key: 'PROJ',
      summary: 'Sprint 1 Execution',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-200');

    const fields = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0][1].fields;
    expect(fields.issuetype.name).toBe('Test Execution');
  });

  it('adds tests via xray when test_keys provided', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-200', id: '10200', self: '' },
    });
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: '10001' } });
    (mockXrayService.addTestsToTestExecution as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await createTestExecution(mockJiraClient, mockXrayService, {
      project_key: 'PROJ',
      summary: 'Exec',
      test_keys: ['PROJ-1'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.tests_added).toEqual(['PROJ-1']);
  });

  it('handles test add failure gracefully', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-200', id: '10200', self: '' },
    });
    (mockJiraClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'));

    const result = await createTestExecution(mockJiraClient, mockXrayService, {
      project_key: 'PROJ',
      summary: 'Exec',
      test_keys: ['PROJ-999'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-200');
    expect(parsed.tests_add_warning).toBeDefined();
  });
});
