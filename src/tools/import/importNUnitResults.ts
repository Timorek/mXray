import { z } from 'zod';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

export const importNUnitResultsSchema = {
  xml_content: z.string().describe('NUnit XML results string'),
  project_key: z.string().optional().describe('Jira project key to associate results with'),
};

export async function importNUnitResults(
  xrayService: XrayCloudService | null,
  args: { xml_content: string; project_key?: string },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    const queryParams = args.project_key ? { projectKey: args.project_key } : undefined;
    const result = await xrayService.importNUnitResults(args.xml_content, queryParams);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: unknown) {
    const message = formatApiError(error);
    return {
      content: [{ type: 'text', text: `Error importing NUnit results: ${message}` }],
    };
  }
}
