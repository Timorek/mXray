import { z } from 'zod';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

export const importJUnitResultsSchema = {
  xml_content: z.string().describe('JUnit XML results string'),
  project_key: z.string().optional().describe('Jira project key to associate results with'),
  execution_key: z.string().optional().describe('Existing test execution key to add results to'),
};

export async function importJUnitResults(
  xrayService: XrayCloudService | null,
  args: { xml_content: string; project_key?: string; execution_key?: string },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    const queryParams: Record<string, string> = {};
    if (args.project_key) queryParams.projectKey = args.project_key;
    if (args.execution_key) queryParams.testExecKey = args.execution_key;

    const result = await xrayService.importJUnitResults(args.xml_content, Object.keys(queryParams).length > 0 ? queryParams : undefined);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: unknown) {
    const message = formatApiError(error);
    return {
      content: [{ type: 'text', text: `Error importing JUnit results: ${message}` }],
    };
  }
}
