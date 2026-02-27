import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';

export const updateTestTypeSchema = {
  test_key: z.string().describe('Jira issue key of the test (e.g. "PROJ-123")'),
  test_type: z.enum(['Manual', 'Cucumber', 'Generic']).describe('New Xray test type'),
};

export async function updateTestType(
  jiraClient: AxiosInstance,
  xrayService: XrayCloudService | null,
  args: { test_key: string; test_type: 'Manual' | 'Cucumber' | 'Generic' },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    // Get the Jira issue ID (numeric) from the key
    const issueResponse = await jiraClient.get(`/issue/${args.test_key}`, { params: { fields: 'summary' } });
    const issueId = issueResponse.data.id;

    await xrayService.updateTestType(issueId, args.test_type);

    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, key: args.test_key, test_type: args.test_type }, null, 2) }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error updating test type: ${message}` }],
    };
  }
}
