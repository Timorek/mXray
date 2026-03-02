import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export const listTestPlansSchema = {
  project_key: z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Invalid project_key format. Must be uppercase letters, digits, underscores (e.g. "PROJ")').describe('Jira project key (e.g. "PROJ")'),
  max_results: z.number().optional().default(50).describe('Maximum number of results (default 50)'),
};

export async function listTestPlans(
  jiraClient: AxiosInstance,
  args: { project_key: string; max_results?: number },
): Promise<MCPResponse> {
  if (!PROJECT_KEY_PATTERN.test(args.project_key)) {
    return {
      content: [{ type: 'text', text: 'Error: Invalid project_key format. Must match pattern: ^[A-Z][A-Z0-9_]*$' }],
      isError: true,
    };
  }

  try {
    const jql = `project = "${args.project_key}" AND issuetype = "Test Plan"`;
    const maxResults = args.max_results ?? 50;

    const response = await jiraClient.post('/search/jql', {
      jql,
      maxResults,
      fields: ['summary', 'status', 'labels', 'created', 'assignee'],
    });

    const { issues, total } = response.data;

    const plans = issues.map((issue: { key: string; fields: { summary: string; status: { name: string }; assignee?: { displayName: string } | null; created: string } }) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName ?? null,
      created: issue.fields.created,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify({ total, count: plans.length, plans }, null, 2) }],
    };
  } catch (error: unknown) {
    return {
      content: [{ type: 'text', text: formatApiError(error) }],
      isError: true,
    };
  }
}
