import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';

export const getTestSetSchema = {
  set_key: z.string().describe('Jira issue key of the test set (e.g. "PROJ-200")'),
};

export async function getTestSet(
  jiraClient: AxiosInstance,
  xrayService: XrayCloudService | null,
  args: { set_key: string },
): Promise<MCPResponse> {
  const response = await jiraClient.get(`/issue/${args.set_key}`);
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
      const xrayData = await xrayService.getTestSet(issue.id);
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
