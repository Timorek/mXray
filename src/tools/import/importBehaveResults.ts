import { z } from 'zod';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

export const importBehaveResultsSchema = {
  results: z.string().describe('Behave JSON format results string'),
};

export async function importBehaveResults(
  xrayService: XrayCloudService | null,
  args: { results: string },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    const parsed = JSON.parse(args.results);
    const result = await xrayService.importBehaveResults(parsed);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: unknown) {
    const message = formatApiError(error);
    return {
      content: [{ type: 'text', text: `Error importing Behave results: ${message}` }],
    };
  }
}
