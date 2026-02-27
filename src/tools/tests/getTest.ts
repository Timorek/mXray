import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { MCPResponse } from '../../types.js';

export const getTestSchema = {
  test_key: z.string().describe('Jira issue key of the test (e.g. "PROJ-123")'),
};

export async function getTest(
  jiraClient: AxiosInstance,
  args: { test_key: string },
): Promise<MCPResponse> {
  const response = await jiraClient.get(`/issue/${args.test_key}`);
  const issue = response.data;

  const result = {
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

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
