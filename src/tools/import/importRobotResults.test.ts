import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { importRobotResults } from './importRobotResults.js';

const mockXrayService = {
  importRobotResults: vi.fn(),
} as unknown as XrayCloudService;

describe('importRobotResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await importRobotResults(null, { xml_content: '<xml/>' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('imports XML content', async () => {
    (mockXrayService.importRobotResults as ReturnType<typeof vi.fn>).mockResolvedValue({ key: 'PROJ-500' });

    const result = await importRobotResults(mockXrayService, { xml_content: '<robot/>' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-500');
  });

  it('passes project key as query param', async () => {
    (mockXrayService.importRobotResults as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await importRobotResults(mockXrayService, { xml_content: '<xml/>', project_key: 'PROJ' });
    expect(mockXrayService.importRobotResults).toHaveBeenCalledWith('<xml/>', { projectKey: 'PROJ' });
  });

  it('handles API errors', async () => {
    (mockXrayService.importRobotResults as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await importRobotResults(mockXrayService, { xml_content: '<xml/>' });
    expect(result.content[0].text).toContain('Error importing Robot Framework results');
  });
});
