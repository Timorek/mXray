import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

export const addTestsToTestSetSchema = {
  set_key: z.string().describe('Jira issue key of the test set (e.g. "PROJ-200")'),
  test_keys: z.array(z.string()).describe('Test issue keys to add (e.g. ["PROJ-1", "PROJ-2"])'),
};

export async function addTestsToTestSet(
  jiraClient: AxiosInstance,
  xrayService: XrayCloudService | null,
  args: { set_key: string; test_keys: string[] },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    // Resolve set key to issue ID
    const setResponse = await jiraClient.get(`/issue/${args.set_key}`, { params: { fields: 'summary' } });
    const setIssueId = setResponse.data.id;

    // Resolve test keys to issue IDs in parallel
    const testIssueIds = await Promise.all(
      args.test_keys.map(async (testKey) => {
        const testResponse = await jiraClient.get(`/issue/${testKey}`, { params: { fields: 'summary' } });
        return testResponse.data.id as string;
      }),
    );

    const result = await xrayService.addTestsToTestSet(setIssueId, testIssueIds) as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify({
        success: true,
        set_key: args.set_key,
        test_keys: args.test_keys,
        ...(result && typeof result === 'object' ? result : {}),
      }, null, 2) }],
    };
  } catch (error: unknown) {
    const message = formatApiError(error);
    return {
      content: [{ type: 'text', text: `Error adding tests to test set: ${message}` }],
    };
  }
}
