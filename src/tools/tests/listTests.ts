import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { MCPResponse } from '../../types.js';

export const listTestsSchema = {
  project_key: z.string().describe('Jira project key (e.g. "PROJ")'),
  labels: z.array(z.string()).optional().describe('Filter by labels'),
  component: z.string().optional().describe('Filter by component name'),
  max_results: z.number().optional().default(50).describe('Maximum number of results (default 50)'),
};

export async function listTests(
  jiraClient: AxiosInstance,
  args: { project_key: string; labels?: string[]; component?: string; max_results?: number },
): Promise<MCPResponse> {
  let jql = `project = "${args.project_key}" AND issuetype = Test`;

  if (args.labels && args.labels.length > 0) {
    const labelFilter = args.labels.map((l) => `"${l}"`).join(', ');
    jql += ` AND labels IN (${labelFilter})`;
  }

  if (args.component) {
    jql += ` AND component = "${args.component}"`;
  }

  const maxResults = args.max_results ?? 50;

  const response = await jiraClient.post('/search/jql', {
    jql,
    maxResults,
    fields: ['summary', 'status', 'labels', 'components', 'issuetype'],
  });

  const { issues, total } = response.data;

  const tests = issues.map((issue: { key: string; fields: { summary: string; status: { name: string }; labels?: string[]; components?: Array<{ name: string }> } }) => ({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    labels: issue.fields.labels ?? [],
    components: (issue.fields.components ?? []).map((c: { name: string }) => c.name),
  }));

  return {
    content: [{ type: 'text', text: JSON.stringify({ total, count: tests.length, tests }, null, 2) }],
  };
}
