import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

export const createTestSetSchema = {
  project_key: z.string().describe('Jira project key (e.g. "PROJ")'),
  summary: z.string().describe('Test set summary/title'),
  description: z.string().optional().describe('Test set description'),
};

export async function createTestSet(
  jiraClient: AxiosInstance,
  args: { project_key: string; summary: string; description?: string },
): Promise<MCPResponse> {
  try {
    const fields: Record<string, unknown> = {
      project: { key: args.project_key },
      summary: args.summary,
      issuetype: { name: 'Test Set' },
    };

    if (args.description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: args.description }] }],
      };
    }

    const response = await jiraClient.post('/issue', { fields });

    return {
      content: [{ type: 'text', text: JSON.stringify({ key: response.data.key, id: response.data.id, self: response.data.self }, null, 2) }],
    };
  } catch (error: unknown) {
    return {
      content: [{ type: 'text', text: formatApiError(error) }],
      isError: true,
    };
  }
}
