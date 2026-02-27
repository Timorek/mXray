import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { MCPResponse } from '../../types.js';

export const createTestSchema = {
  project_key: z.string().describe('Jira project key (e.g. "PROJ")'),
  summary: z.string().describe('Test summary/title'),
  test_type: z.enum(['Manual', 'Cucumber', 'Generic']).describe('Xray test type'),
  description: z.string().optional().describe('Test description'),
  labels: z.array(z.string()).optional().describe('Labels to assign'),
  components: z.array(z.string()).optional().describe('Component names to assign'),
};

export async function createTest(
  jiraClient: AxiosInstance,
  args: {
    project_key: string;
    summary: string;
    test_type: 'Manual' | 'Cucumber' | 'Generic';
    description?: string;
    labels?: string[];
    components?: string[];
  },
): Promise<MCPResponse> {
  const fields: Record<string, unknown> = {
    project: { key: args.project_key },
    summary: args.summary,
    issuetype: { name: 'Test' },
  };

  if (args.description) {
    fields.description = {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: args.description }] }],
    };
  }

  if (args.labels && args.labels.length > 0) {
    fields.labels = args.labels;
  }

  if (args.components && args.components.length > 0) {
    fields.components = args.components.map((name) => ({ name }));
  }

  const response = await jiraClient.post('/issue', { fields });

  return {
    content: [{ type: 'text', text: JSON.stringify({ key: response.data.key, id: response.data.id, self: response.data.self, test_type: args.test_type }, null, 2) }],
  };
}
