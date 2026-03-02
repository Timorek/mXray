import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { createTest } from './createTest.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

const mockXrayService = {
  updateTestType: vi.fn(),
} as unknown as XrayCloudService;

describe('createTest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a basic test and applies test type via Xray', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-10', id: '10010', self: 'https://jira/issue/10010' },
    });
    (mockXrayService.updateTestType as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await createTest(mockJiraClient, mockXrayService, {
      project_key: 'PROJ',
      summary: 'New test',
      test_type: 'Manual',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-10');
    expect(parsed.test_type).toBe('Manual');
    expect(parsed.test_type_applied).toBe(true);
    expect(mockXrayService.updateTestType).toHaveBeenCalledWith('10010', 'Manual');

    const call = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].fields.issuetype.name).toBe('Test');
    expect(call[1].fields.project.key).toBe('PROJ');
  });

  it('includes description as ADF', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-11', id: '10011', self: '' },
    });
    (mockXrayService.updateTestType as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await createTest(mockJiraClient, mockXrayService, {
      project_key: 'PROJ',
      summary: 'Test',
      test_type: 'Cucumber',
      description: 'My description',
    });

    const fields = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0][1].fields;
    expect(fields.description.type).toBe('doc');
    expect(fields.description.content[0].content[0].text).toBe('My description');
  });

  it('includes labels and components', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-12', id: '10012', self: '' },
    });
    (mockXrayService.updateTestType as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await createTest(mockJiraClient, mockXrayService, {
      project_key: 'PROJ',
      summary: 'Test',
      test_type: 'Generic',
      labels: ['smoke'],
      components: ['Auth'],
    });

    const fields = (mockJiraClient.post as ReturnType<typeof vi.fn>).mock.calls[0][1].fields;
    expect(fields.labels).toEqual(['smoke']);
    expect(fields.components).toEqual([{ name: 'Auth' }]);
  });

  it('warns when xrayService is null', async () => {
    (mockJiraClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { key: 'PROJ-13', id: '10013', self: '' },
    });

    const result = await createTest(mockJiraClient, null, {
      project_key: 'PROJ',
      summary: 'Test',
      test_type: 'Manual',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.test_type_applied).toBe(false);
    expect(parsed.test_type_warning).toContain('Xray credentials not configured');
  });
});
