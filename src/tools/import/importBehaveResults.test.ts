import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { importBehaveResults } from './importBehaveResults.js';

const mockXrayService = {
  importBehaveResults: vi.fn(),
} as unknown as XrayCloudService;

describe('importBehaveResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await importBehaveResults(null, { results: '[]' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('parses JSON and imports', async () => {
    (mockXrayService.importBehaveResults as ReturnType<typeof vi.fn>).mockResolvedValue({ key: 'PROJ-500' });

    const result = await importBehaveResults(mockXrayService, { results: '[{"keyword":"Feature"}]' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-500');
  });

  it('handles invalid JSON', async () => {
    const result = await importBehaveResults(mockXrayService, { results: 'bad json' });
    expect(result.content[0].text).toContain('Error importing Behave results');
  });

  it('handles API errors', async () => {
    (mockXrayService.importBehaveResults as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await importBehaveResults(mockXrayService, { results: '[]' });
    expect(result.content[0].text).toContain('Error importing Behave results');
  });
});
