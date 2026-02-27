import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { ConfigSchema } from './types.js';
import { XrayCloudService } from './services/XrayCloudService.js';
import { listTestsSchema, listTests } from './tools/tests/listTests.js';
import { getTestSchema, getTest } from './tools/tests/getTest.js';
import { getTestWithStepsSchema, getTestWithSteps } from './tools/tests/getTestWithSteps.js';
import { createTestSchema, createTest } from './tools/tests/createTest.js';
import { updateTestSchema, updateTest } from './tools/tests/updateTest.js';
import { updateTestTypeSchema, updateTestType } from './tools/tests/updateTestType.js';
import { updateGherkinTestDefinitionSchema, updateGherkinTestDefinition } from './tools/tests/updateGherkinTestDefinition.js';
import { listTestExecutionsSchema, listTestExecutions } from './tools/test-executions/listTestExecutions.js';
import { getTestExecutionSchema, getTestExecution } from './tools/test-executions/getTestExecution.js';
import { createTestExecutionSchema, createTestExecution } from './tools/test-executions/createTestExecution.js';
import { updateTestRunSchema, updateTestRun } from './tools/test-executions/updateTestRun.js';
import { listTestPlansSchema, listTestPlans } from './tools/test-plans/listTestPlans.js';
import { getTestPlanSchema, getTestPlan } from './tools/test-plans/getTestPlan.js';
import { createTestPlanSchema, createTestPlan } from './tools/test-plans/createTestPlan.js';
import { addTestsToTestPlanSchema, addTestsToTestPlan } from './tools/test-plans/addTestsToTestPlan.js';
import { listTestSetsSchema, listTestSets } from './tools/test-sets/listTestSets.js';
import { getTestSetSchema, getTestSet } from './tools/test-sets/getTestSet.js';
import { addTestsToTestSetSchema, addTestsToTestSet } from './tools/test-sets/addTestsToTestSet.js';

// ── Config ────────────────────────────────────────────────────────────────

const configResult = ConfigSchema.safeParse({
  JIRA_BASE_URL: process.env.JIRA_BASE_URL,
  JIRA_EMAIL: process.env.JIRA_EMAIL,
  JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
  XRAY_CLIENT_ID: process.env.XRAY_CLIENT_ID || undefined,
  XRAY_CLIENT_SECRET: process.env.XRAY_CLIENT_SECRET || undefined,
});

if (!configResult.success) {
  console.error('[mXray] Invalid configuration:', configResult.error.format());
  process.exit(1);
}

const config = configResult.data;

// ── Jira Axios Instance ───────────────────────────────────────────────────

const jiraToken = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString('base64');

export const jiraClient = axios.create({
  baseURL: `${config.JIRA_BASE_URL}/rest/api/3`,
  headers: {
    Authorization: `Basic ${jiraToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Xray Cloud Service ────────────────────────────────────────────────────

let xrayService: XrayCloudService | null = null;
if (XrayCloudService.isConfigured(config)) {
  xrayService = XrayCloudService.getInstance(config);
  console.error('[mXray] Xray Cloud credentials configured');
} else {
  console.error('[mXray] Xray Cloud credentials not set — Xray-specific tools will be unavailable');
}

export { xrayService, config };

// ── MCP Server ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'mxray',
  version: '0.1.0',
});

// Tools will be registered here in subsequent phases

// ── Tests Domain ──────────────────────────────────────────────────────────

server.registerTool('list_tests', {
  description: 'List tests in a Jira project. Supports filtering by labels and component.',
  inputSchema: listTestsSchema,
}, async (args) => listTests(jiraClient, args));

server.registerTool('get_test', {
  description: 'Get details of a specific test from Jira.',
  inputSchema: getTestSchema,
}, async (args) => getTest(jiraClient, args));

server.registerTool('get_test_with_steps', {
  description: 'Get test details including test steps from Xray (requires Xray credentials).',
  inputSchema: getTestWithStepsSchema,
}, async (args) => getTestWithSteps(xrayService, args));

server.registerTool('create_test', {
  description: 'Create a new test in Jira with specified type (Manual/Cucumber/Generic).',
  inputSchema: createTestSchema,
}, async (args) => createTest(jiraClient, args));

server.registerTool('update_test', {
  description: 'Update fields of an existing test in Jira.',
  inputSchema: updateTestSchema,
}, async (args) => updateTest(jiraClient, args));

server.registerTool('update_test_type', {
  description: 'Change the Xray test type (Manual/Cucumber/Generic) via GraphQL (requires Xray credentials).',
  inputSchema: updateTestTypeSchema,
}, async (args) => updateTestType(jiraClient, xrayService, args));

server.registerTool('update_gherkin_test_definition', {
  description: 'Update the Gherkin scenario definition of a Cucumber test via GraphQL (requires Xray credentials).',
  inputSchema: updateGherkinTestDefinitionSchema,
}, async (args) => updateGherkinTestDefinition(jiraClient, xrayService, args));

// ── Test Executions Domain ────────────────────────────────────────────────

server.registerTool('list_test_executions', {
  description: 'List test executions in a Jira project.',
  inputSchema: listTestExecutionsSchema,
}, async (args) => listTestExecutions(jiraClient, args));

server.registerTool('get_test_execution', {
  description: 'Get details of a test execution, including associated test runs if Xray is configured.',
  inputSchema: getTestExecutionSchema,
}, async (args) => getTestExecution(jiraClient, xrayService, args));

server.registerTool('create_test_execution', {
  description: 'Create a new test execution in Jira. Optionally add tests to it (requires Xray credentials for adding tests).',
  inputSchema: createTestExecutionSchema,
}, async (args) => createTestExecution(jiraClient, xrayService, args));

server.registerTool('update_test_run', {
  description: 'Update the status and comment of a test run within a test execution (requires Xray credentials).',
  inputSchema: updateTestRunSchema,
}, async (args) => updateTestRun(jiraClient, xrayService, args));

// ── Test Plans Domain ─────────────────────────────────────────────────────

server.registerTool('list_test_plans', {
  description: 'List test plans in a Jira project.',
  inputSchema: listTestPlansSchema,
}, async (args) => listTestPlans(jiraClient, args));

server.registerTool('get_test_plan', {
  description: 'Get details of a test plan, including associated tests if Xray is configured.',
  inputSchema: getTestPlanSchema,
}, async (args) => getTestPlan(jiraClient, xrayService, args));

server.registerTool('create_test_plan', {
  description: 'Create a new test plan in Jira.',
  inputSchema: createTestPlanSchema,
}, async (args) => createTestPlan(jiraClient, args));

server.registerTool('add_tests_to_test_plan', {
  description: 'Add tests to an existing test plan via Xray GraphQL (requires Xray credentials).',
  inputSchema: addTestsToTestPlanSchema,
}, async (args) => addTestsToTestPlan(jiraClient, xrayService, args));

// ── Test Sets Domain ──────────────────────────────────────────────────────

server.registerTool('list_test_sets', {
  description: 'List test sets in a Jira project.',
  inputSchema: listTestSetsSchema,
}, async (args) => listTestSets(jiraClient, args));

server.registerTool('get_test_set', {
  description: 'Get details of a test set, including associated tests if Xray is configured.',
  inputSchema: getTestSetSchema,
}, async (args) => getTestSet(jiraClient, xrayService, args));

server.registerTool('add_tests_to_test_set', {
  description: 'Add tests to an existing test set via Xray GraphQL (requires Xray credentials).',
  inputSchema: addTestsToTestSetSchema,
}, async (args) => addTestsToTestSet(jiraClient, xrayService, args));

// ── Start ─────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mXray] MCP server running on stdio');
}

main().catch((err) => {
  console.error('[mXray] Fatal error:', err);
  process.exit(1);
});

export { server };
