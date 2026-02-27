import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { ConfigSchema } from './types.js';
import { XrayCloudService } from './services/XrayCloudService.js';

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
