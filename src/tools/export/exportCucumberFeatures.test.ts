import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { exportCucumberFeatures } from './exportCucumberFeatures.js';

const mockXrayService = {
  exportCucumberFeatures: vi.fn(),
} as unknown as XrayCloudService;

describe('exportCucumberFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await exportCucumberFeatures(null, {});
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('exports features as base64 zip', async () => {
    const fakeZip = Buffer.from('PK fake zip content');
    (mockXrayService.exportCucumberFeatures as ReturnType<typeof vi.fn>).mockResolvedValue(fakeZip);

    const result = await exportCucumberFeatures(mockXrayService, {});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.format).toBe('zip');
    expect(parsed.encoding).toBe('base64');
    expect(parsed.data).toBe(fakeZip.toString('base64'));
  });

  it('passes test keys when provided', async () => {
    (mockXrayService.exportCucumberFeatures as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from(''));

    await exportCucumberFeatures(mockXrayService, { test_keys: 'PROJ-1,PROJ-2' });
    expect(mockXrayService.exportCucumberFeatures).toHaveBeenCalledWith('PROJ-1,PROJ-2');
  });

  it('handles API errors', async () => {
    (mockXrayService.exportCucumberFeatures as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await exportCucumberFeatures(mockXrayService, {});
    expect(result.content[0].text).toContain('Error exporting Cucumber features');
  });
});
