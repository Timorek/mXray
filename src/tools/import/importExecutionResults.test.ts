import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { importExecutionResults } from './importExecutionResults.js';

const mockXrayService = {
  importExecutionResults: vi.fn(),
} as unknown as XrayCloudService;

describe('importExecutionResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await importExecutionResults(null, { results: '{}' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('parses JSON and imports', async () => {
    (mockXrayService.importExecutionResults as ReturnType<typeof vi.fn>).mockResolvedValue({ key: 'PROJ-500' });

    const result = await importExecutionResults(mockXrayService, {
      results: '{"testExecutionKey":"PROJ-100","tests":[]}',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.key).toBe('PROJ-500');
  });

  it('handles invalid JSON', async () => {
    const result = await importExecutionResults(mockXrayService, { results: 'not json' });
    expect(result.content[0].text).toContain('Error importing execution results');
  });

  it('handles API errors', async () => {
    (mockXrayService.importExecutionResults as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'));

    const result = await importExecutionResults(mockXrayService, { results: '{}' });
    expect(result.content[0].text).toContain('Error importing execution results');
  });
});
