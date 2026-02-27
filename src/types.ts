import { z } from 'zod';

// ── Config ──────────────────────────────────────────────────────────────────

export const ConfigSchema = z.object({
  JIRA_BASE_URL: z.string().url(),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),
  XRAY_CLIENT_ID: z.string().optional(),
  XRAY_CLIENT_SECRET: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

// ── MCP Response ────────────────────────────────────────────────────────────

export type MCPResponse = {
  content: Array<{ type: 'text'; text: string }>;
};

// ── Enums ───────────────────────────────────────────────────────────────────

export type XrayTestType = 'Manual' | 'Cucumber' | 'Generic';

export type TestStatus = 'TODO' | 'EXECUTING' | 'PASS' | 'FAIL' | 'ABORTED';

// ── Jira Types ──────────────────────────────────────────────────────────────

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: unknown;
    status: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    labels?: string[];
    components?: Array<{ name: string }>;
    assignee?: JiraUser | null;
    reporter?: JiraUser | null;
    created?: string;
    updated?: string;
    [key: string]: unknown;
  };
}

export interface JiraSearchResponse {
  expand?: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

// ── Xray Types ──────────────────────────────────────────────────────────────

export interface XrayCloudToken {
  token: string;
  expiresAt: number;
}

export interface XrayTestStep {
  id: string;
  action: string;
  data: string;
  result: string;
}

export interface XrayTest {
  issueId: string;
  testType: {
    name: string;
    kind: string;
  };
  steps?: {
    steps: XrayTestStep[];
  };
  gherkin?: string;
  unstructured?: string;
  jira: {
    key: string;
    summary: string;
  };
}

export interface XrayTestRun {
  id: string;
  status: {
    name: string;
  };
  test: {
    issueId: string;
    jira: {
      key: string;
      summary: string;
    };
  };
  comment?: string;
}

export interface XrayTestExecution {
  issueId: string;
  jira: {
    key: string;
    summary: string;
  };
  testRuns?: {
    results: XrayTestRun[];
  };
}

export interface XrayTestPlan {
  issueId: string;
  jira: {
    key: string;
    summary: string;
  };
  tests?: {
    results: Array<{
      issueId: string;
      jira: {
        key: string;
        summary: string;
      };
    }>;
  };
}

export interface XrayTestSet {
  issueId: string;
  jira: {
    key: string;
    summary: string;
  };
  tests?: {
    results: Array<{
      issueId: string;
      jira: {
        key: string;
        summary: string;
      };
    }>;
  };
}

export interface TestImportResponse {
  key?: string;
  id?: string;
  self?: string;
}

export interface XrayPrecondition {
  issueId: string;
  jira: {
    key: string;
    summary: string;
  };
  definition: string;
  preconditionType: {
    name: string;
  };
}
