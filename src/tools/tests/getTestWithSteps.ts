import { z } from 'zod';
import type { XrayCloudService } from '../../services/XrayCloudService.js';
import type { MCPResponse } from '../../types.js';

export const getTestWithStepsSchema = {
  test_key: z.string().describe('Jira issue key of the test (e.g. "PROJ-123")'),
};

export async function getTestWithSteps(
  xrayService: XrayCloudService | null,
  args: { test_key: string },
): Promise<MCPResponse> {
  if (!xrayService) {
    return {
      content: [{ type: 'text', text: 'Error: Xray Cloud credentials are not configured. This tool requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET.' }],
    };
  }

  const test = await xrayService.getTestWithSteps(args.test_key);

  if (!test) {
    return {
      content: [{ type: 'text', text: `Test ${args.test_key} not found in Xray.` }],
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(test, null, 2) }],
  };
}
