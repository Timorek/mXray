import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';

export const updateTestRunSchema = {
  execution_key: z.string().describe('Jira issue key of the test execution (e.g. "PROJ-456")'),
  test_key: z.string().describe('Jira issue key of the test (e.g. "PROJ-123")'),
  status: z.enum(['TODO', 'EXECUTING', 'PASSED', 'FAILED', 'ABORTED']).describe('Test run status'),
  comment: z.string().optional().describe('Comment to add to the test run'),
};

export async function updateTestRun(
  jiraClient: AxiosInstance,
  xrayService: XrayCloudService | null,
  args: {
    execution_key: string;
    test_key: string;
    status: 'TODO' | 'EXECUTING' | 'PASSED' | 'FAILED' | 'ABORTED';
    comment?: string;
  },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  try {
    // Resolve keys to issue IDs
    const [execResponse, testResponse] = await Promise.all([
      jiraClient.get(`/issue/${args.execution_key}`, { params: { fields: 'summary' } }),
      jiraClient.get(`/issue/${args.test_key}`, { params: { fields: 'summary' } }),
    ]);

    const execIssueId = execResponse.data.id;
    const testIssueId = testResponse.data.id;

    // Get the test run for this test+execution pair
    const testRun = await xrayService.getTestRun(testIssueId, execIssueId);
    if (!testRun || !testRun.id) {
      return {
        content: [{ type: 'text', text: `Error: No test run found for test ${args.test_key} in execution ${args.execution_key}` }],
      };
    }

    // Update the test run status
    await xrayService.updateTestRunStatus(testRun.id, args.status);

    // Optionally add a comment
    if (args.comment) {
      await xrayService.updateTestRunComment(testRun.id, args.comment);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({
        success: true,
        execution_key: args.execution_key,
        test_key: args.test_key,
        status: args.status,
        comment: args.comment ?? null,
      }, null, 2) }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error updating test run: ${message}` }],
    };
  }
}
