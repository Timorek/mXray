import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { importNUnitResults } from './importNUnitResults.js';

const mockXrayService = {
  importNUnitResults: vi.fn(),
} as unknown as XrayCloudService;

describe('importNUnitResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await importNUnitResults(null, { xml_content: '<xml/>' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('imports XML content', async () => {
    (mockXrayService.importNUnitResults as ReturnType<typeof vi.fn>).mockResolvedValue({ key: 'PROJ-500' });

    const result = await importNUnitResults(mockXrayService, { xml_content: '<test-results/>' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-500');
  });

  it('passes project key as query param', async () => {
    (mockXrayService.importNUnitResults as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await importNUnitResults(mockXrayService, { xml_content: '<xml/>', project_key: 'PROJ' });
    expect(mockXrayService.importNUnitResults).toHaveBeenCalledWith('<xml/>', { projectKey: 'PROJ' });
  });

  it('handles API errors', async () => {
    (mockXrayService.importNUnitResults as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await importNUnitResults(mockXrayService, { xml_content: '<xml/>' });
    expect(result.content[0].text).toContain('Error importing NUnit results');
  });
});
