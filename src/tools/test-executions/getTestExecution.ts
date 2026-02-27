import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';

export const getTestExecutionSchema = {
  execution_key: z.string().describe('Jira issue key of the test execution (e.g. "PROJ-456")'),
};

export async function getTestExecution(
  jiraClient: AxiosInstance,
  xrayService: XrayCloudService | null,
  args: { execution_key: string },
): Promise<MCPResponse> {
  // Get Jira issue details
  const response = await jiraClient.get(`/issue/${args.execution_key}`);
  const issue = response.data;

  const result: Record<string, unknown> = {
    key: issue.key,
    id: issue.id,
    summary: issue.fields.summary,
    description: issue.fields.description,
    status: issue.fields.status?.name,
    issuetype: issue.fields.issuetype?.name,
    labels: issue.fields.labels ?? [],
    components: (issue.fields.components ?? []).map((c: { name: string }) => c.name),
    assignee: issue.fields.assignee?.displayName ?? null,
    reporter: issue.fields.reporter?.displayName ?? null,
    created: issue.fields.created,
    updated: issue.fields.updated,
  };

  // Fetch associated test runs from Xray if available
  if (xrayService) {
    try {
      const xrayData = await xrayService.getTestExecution(issue.id);
      if (xrayData) {
        result.testRuns = xrayData;
      }
    } catch {
      // Xray data not available — return Jira data only
    }
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
