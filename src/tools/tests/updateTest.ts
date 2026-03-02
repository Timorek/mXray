import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { MCPResponse } from '../../types.js';

export const updateTestSchema = {
  test_key: z.string().describe('Jira issue key of the test (e.g. "PROJ-123")'),
  summary: z.string().optional().describe('New summary/title'),
  description: z.string().optional().describe('New description'),
  labels: z.array(z.string()).optional().describe('New labels (replaces existing)'),
  components: z.array(z.string()).optional().describe('New component names (replaces existing)'),
};

export async function updateTest(
  jiraClient: AxiosInstance,
  args: {
    test_key: string;
    summary?: string;
    description?: string;
    labels?: string[];
    components?: string[];
  },
): Promise<MCPResponse> {
  const fields: Record<string, unknown> = {};

  if (args.summary !== undefined) {
    fields.summary = args.summary;
  }

  if (args.description !== undefined) {
    fields.description = {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: args.description }] }],
    };
  }

  if (args.labels) {
    fields.labels = args.labels;
  }

  if (args.components) {
    fields.components = args.components.map((name) => ({ name }));
  }

  await jiraClient.put(`/issue/${args.test_key}`, { fields });

  return {
    content: [{ type: 'text', text: JSON.stringify({ success: true, key: args.test_key, updated_fields: Object.keys(fields) }, null, 2) }],
  };
}
