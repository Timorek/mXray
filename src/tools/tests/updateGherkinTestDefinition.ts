import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';

export const updateGherkinTestDefinitionSchema = {
  test_key: z.string().describe('Jira issue key of the test (e.g. "PROJ-123")'),
  gherkin: z.string().describe('Full Gherkin scenario text'),
};

export async function updateGherkinTestDefinition(
  jiraClient: AxiosInstance,
  xrayService: XrayCloudService | null,
  args: { test_key: string; gherkin: string },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    const issueResponse = await jiraClient.get(`/issue/${args.test_key}`, { params: { fields: 'summary' } });
    const issueId = issueResponse.data.id;

    await xrayService.updateGherkinTestDefinition(issueId, args.gherkin);

    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, key: args.test_key, message: 'Gherkin test definition updated' }, null, 2) }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error updating Gherkin definition: ${message}` }],
    };
  }
}
