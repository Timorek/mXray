import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { importCucumberResults } from './importCucumberResults.js';

const mockXrayService = {
  importCucumberResults: vi.fn(),
} as unknown as XrayCloudService;

describe('importCucumberResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await importCucumberResults(null, { results: '[]', project_key: 'PROJ' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('parses JSON and imports with project key', async () => {
    (mockXrayService.importCucumberResults as ReturnType<typeof vi.fn>).mockResolvedValue({ key: 'PROJ-500' });

    const result = await importCucumberResults(mockXrayService, { results: '[{"keyword":"Feature"}]', project_key: 'PROJ' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.key).toBe('PROJ-500');
    expect(mockXrayService.importCucumberResults).toHaveBeenCalledWith([{ keyword: 'Feature' }], 'PROJ', undefined);
  });

  it('handles invalid JSON', async () => {
    const result = await importCucumberResults(mockXrayService, { results: 'bad', project_key: 'PROJ' });
    expect(result.content[0].text).toContain('Error importing Cucumber results');
  });

  it('handles API errors', async () => {
    (mockXrayService.importCucumberResults as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await importCucumberResults(mockXrayService, { results: '[]', project_key: 'PROJ' });
    expect(result.content[0].text).toContain('Error importing Cucumber results');
  });
});
