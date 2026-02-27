import { ConfigSchema } from './types.js';

const config = ConfigSchema.parse({
  JIRA_BASE_URL: process.env.JIRA_BASE_URL,
  JIRA_EMAIL: process.env.JIRA_EMAIL,
  JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
  XRAY_CLIENT_ID: process.env.XRAY_CLIENT_ID || undefined,
  XRAY_CLIENT_SECRET: process.env.XRAY_CLIENT_SECRET || undefined,
});

console.error(`[mXray] Config validated. Jira: ${config.JIRA_BASE_URL}`);
