import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { importTestNGResults } from './importTestNGResults.js';

const mockXrayService = {
  importTestNGResults: vi.fn(),
} as unknown as XrayCloudService;

describe('importTestNGResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await importTestNGResults(null, { xml_content: '<xml/>' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('imports XML content', async () => {
    (mockXrayService.importTestNGResults as ReturnType<typeof vi.fn>).mockResolvedValue({ key: 'PROJ-500' });

    const result = await importTestNGResults(mockXrayService, { xml_content: '<testng-results/>' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-500');
  });

  it('passes project key as query param', async () => {
    (mockXrayService.importTestNGResults as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await importTestNGResults(mockXrayService, { xml_content: '<xml/>', project_key: 'PROJ' });
    expect(mockXrayService.importTestNGResults).toHaveBeenCalledWith('<xml/>', { projectKey: 'PROJ' });
  });

  it('handles API errors', async () => {
    (mockXrayService.importTestNGResults as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await importTestNGResults(mockXrayService, { xml_content: '<xml/>' });
    expect(result.content[0].text).toContain('Error importing TestNG results');
  });
});
