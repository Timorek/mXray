import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

export const addTestsToTestPlanSchema = {
  plan_key: z.string().describe('Jira issue key of the test plan (e.g. "PROJ-100")'),
  test_keys: z.array(z.string()).describe('Test issue keys to add (e.g. ["PROJ-1", "PROJ-2"])'),
};

export async function addTestsToTestPlan(
  jiraClient: AxiosInstance,
  xrayService: XrayCloudService | null,
  args: { plan_key: string; test_keys: string[] },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    // Resolve plan key to issue ID
    const planResponse = await jiraClient.get(`/issue/${args.plan_key}`, { params: { fields: 'summary' } });
    const planIssueId = planResponse.data.id;

    // Resolve test keys to issue IDs
    const testIssueIds: string[] = [];
    for (const testKey of args.test_keys) {
      const testResponse = await jiraClient.get(`/issue/${testKey}`, { params: { fields: 'summary' } });
      testIssueIds.push(testResponse.data.id);
    }

    const result = await xrayService.addTestsToTestPlan(planIssueId, testIssueIds) as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify({
        success: true,
        plan_key: args.plan_key,
        test_keys: args.test_keys,
        ...(result && typeof result === 'object' ? result : {}),
      }, null, 2) }],
    };
  } catch (error: unknown) {
    const message = formatApiError(error);
    return {
      content: [{ type: 'text', text: `Error adding tests to test plan: ${message}` }],
    };
  }
}
