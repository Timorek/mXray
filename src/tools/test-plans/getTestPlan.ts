import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';

export const getTestPlanSchema = {
  plan_key: z.string().describe('Jira issue key of the test plan (e.g. "PROJ-100")'),
};

export async function getTestPlan(
  jiraClient: AxiosInstance,
  xrayService: XrayCloudService | null,
  args: { plan_key: string },
): Promise<MCPResponse> {
  const response = await jiraClient.get(`/issue/${args.plan_key}`);
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

  // Fetch associated tests from Xray if available
  if (xrayService) {
    try {
      const xrayData = await xrayService.getTestPlan(issue.id);
      if (xrayData) {
        result.tests = xrayData;
      }
    } catch {
      // Xray data not available
    }
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
