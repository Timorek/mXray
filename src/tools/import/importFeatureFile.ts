import { z } from 'zod';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

export const importFeatureFileSchema = {
  feature_content: z.string().describe('Cucumber .feature file content'),
  project_key: z.string().describe('Jira project key to create tests in'),
};

export async function importFeatureFile(
  xrayService: XrayCloudService | null,
  args: { feature_content: string; project_key: string },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    const result = await xrayService.importFeatureFile(args.feature_content, { projectKey: args.project_key });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: unknown) {
    const message = formatApiError(error);
    return {
      content: [{ type: 'text', text: `Error importing feature file: ${message}` }],
    };
  }
}
