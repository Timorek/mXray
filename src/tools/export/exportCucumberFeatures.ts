import { z } from 'zod';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

export const exportCucumberFeaturesSchema = {
  test_keys: z.string().optional().describe('Comma-separated test keys to export (e.g. "EXM-1,EXM-2"). If omitted, exports all features.'),
};

export async function exportCucumberFeatures(
  xrayService: XrayCloudService | null,
  args: { test_keys?: string },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    const result = await xrayService.exportCucumberFeatures(args.test_keys);

    // The response is a zip arraybuffer — convert to base64 for MCP transport
    const buffer = Buffer.from(result);
    const base64 = buffer.toString('base64');

    return {
      content: [{ type: 'text', text: JSON.stringify({ format: 'zip', encoding: 'base64', data: base64 }, null, 2) }],
    };
  } catch (error: unknown) {
    const message = formatApiError(error);
    return {
      content: [{ type: 'text', text: `Error exporting Cucumber features: ${message}` }],
    };
  }
}
