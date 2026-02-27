import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { MCPResponse } from '../../types.js';

export const listTestSetsSchema = {
  project_key: z.string().describe('Jira project key (e.g. "PROJ")'),
  max_results: z.number().optional().default(50).describe('Maximum number of results (default 50)'),
};

export async function listTestSets(
  jiraClient: AxiosInstance,
  args: { project_key: string; max_results?: number },
): Promise<MCPResponse> {
  const jql = `project = "${args.project_key}" AND issuetype = "Test Set"`;
  const maxResults = args.max_results ?? 50;

  const response = await jiraClient.post('/search/jql', {
    jql,
    maxResults,
    fields: ['summary', 'status', 'labels', 'created', 'assignee'],
  });

  const { issues, total } = response.data;

  const sets = issues.map((issue: { key: string; fields: { summary: string; status: { name: string }; assignee?: { displayName: string } | null; created: string } }) => ({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    assignee: issue.fields.assignee?.displayName ?? null,
    created: issue.fields.created,
  }));

  return {
    content: [{ type: 'text', text: JSON.stringify({ total, count: sets.length, sets }, null, 2) }],
  };
}
