import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { importFeatureFile } from './importFeatureFile.js';

const mockXrayService = {
  importFeatureFile: vi.fn(),
} as unknown as XrayCloudService;

describe('importFeatureFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await importFeatureFile(null, { feature_content: 'Feature: X', project_key: 'PROJ' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('imports feature content', async () => {
    (mockXrayService.importFeatureFile as ReturnType<typeof vi.fn>).mockResolvedValue({ updatedOrCreatedTests: [{ key: 'PROJ-10' }] });

    const result = await importFeatureFile(mockXrayService, {
      feature_content: 'Feature: Login\n  Scenario: Valid login',
      project_key: 'PROJ',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.updatedOrCreatedTests).toBeDefined();
    expect(mockXrayService.importFeatureFile).toHaveBeenCalledWith('Feature: Login\n  Scenario: Valid login', { projectKey: 'PROJ' });
  });

  it('handles API errors', async () => {
    (mockXrayService.importFeatureFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await importFeatureFile(mockXrayService, { feature_content: '', project_key: 'PROJ' });
    expect(result.content[0].text).toContain('Error importing feature file');
  });
});
