import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import { importJUnitResults } from './importJUnitResults.js';

const mockXrayService = {
  importJUnitResults: vi.fn(),
} as unknown as XrayCloudService;

describe('importJUnitResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when xray service is null', async () => {
    const result = await importJUnitResults(null, { xml_content: '<xml/>' });
    expect(result.content[0].text).toContain('Xray Cloud credentials are not configured');
  });

  it('imports XML content', async () => {
    (mockXrayService.importJUnitResults as ReturnType<typeof vi.fn>).mockResolvedValue({ key: 'PROJ-500' });

    const result = await importJUnitResults(mockXrayService, { xml_content: '<testsuites/>' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.key).toBe('PROJ-500');
    expect(mockXrayService.importJUnitResults).toHaveBeenCalledWith('<testsuites/>', undefined);
  });

  it('passes query params for project and execution keys', async () => {
    (mockXrayService.importJUnitResults as ReturnType<typeof vi.fn>).mockResolvedValue({ key: 'PROJ-500' });

    await importJUnitResults(mockXrayService, {
      xml_content: '<testsuites/>',
      project_key: 'PROJ',
      execution_key: 'PROJ-100',
    });

    expect(mockXrayService.importJUnitResults).toHaveBeenCalledWith('<testsuites/>', {
      projectKey: 'PROJ',
      testExecKey: 'PROJ-100',
    });
  });

  it('handles API errors', async () => {
    (mockXrayService.importJUnitResults as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await importJUnitResults(mockXrayService, { xml_content: '<xml/>' });
    expect(result.content[0].text).toContain('Error importing JUnit results');
  });
});
