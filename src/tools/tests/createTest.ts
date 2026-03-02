import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

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
  xrayService: XrayCloudService | null,
  args: {
    project_key: string;
    summary: string;
    test_type: 'Manual' | 'Cucumber' | 'Generic';
    description?: string;
    labels?: string[];
    components?: string[];
  },
): Promise<MCPResponse> {
  try {
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

    const result: Record<string, unknown> = {
      key: response.data.key,
      id: response.data.id,
      self: response.data.self,
      test_type: args.test_type,
    };

    // Set test type via Xray if available
    if (xrayService) {
      try {
        await xrayService.updateTestType(response.data.id, args.test_type);
        result.test_type_applied = true;
      } catch (error: unknown) {
        result.test_type_applied = false;
        result.test_type_warning = `Test created but failed to set test type: ${formatApiError(error)}`;
      }
    } else {
      result.test_type_applied = false;
      result.test_type_warning = 'Xray credentials not configured — test type was not applied. Use update_test_type to set it manually.';
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: unknown) {
    return {
      content: [{ type: 'text', text: formatApiError(error) }],
      isError: true,
    };
  }
}
