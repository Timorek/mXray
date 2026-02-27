import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';
import { formatApiError } from '../../utils/errors.js';

export const createTestExecutionSchema = {
  project_key: z.string().describe('Jira project key (e.g. "PROJ")'),
  summary: z.string().describe('Test execution summary/title'),
  description: z.string().optional().describe('Test execution description'),
  test_keys: z.array(z.string()).optional().describe('Test issue keys to include (e.g. ["PROJ-1", "PROJ-2"])'),
};

export async function createTestExecution(
  jiraClient: AxiosInstance,
  xrayService: XrayCloudService | null,
  args: {
    project_key: string;
    summary: string;
    description?: string;
    test_keys?: string[];
  },
): Promise<MCPResponse> {
  const fields: Record<string, unknown> = {
    project: { key: args.project_key },
    summary: args.summary,
    issuetype: { name: 'Test Execution' },
  };

  if (args.description) {
    fields.description = {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: args.description }] }],
    };
  }

  const response = await jiraClient.post('/issue', { fields });
  const executionKey = response.data.key;
  const executionId = response.data.id;

  const result: Record<string, unknown> = {
    key: executionKey,
    id: executionId,
    self: response.data.self,
  };

  // Add tests to the execution via Xray GraphQL if test_keys provided
  if (args.test_keys && args.test_keys.length > 0 && xrayService) {
    try {
      // Resolve test keys to issue IDs
      const testIssueIds: string[] = [];
      for (const testKey of args.test_keys) {
        const issueResponse = await jiraClient.get(`/issue/${testKey}`, { params: { fields: 'summary' } });
        testIssueIds.push(issueResponse.data.id);
      }

      await xrayService.addTestsToTestExecution(executionId, testIssueIds);
      result.tests_added = args.test_keys;
    } catch (error: unknown) {
      const message = formatApiError(error);
      result.tests_add_warning = `Tests created but failed to add tests: ${message}`;
    }
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
