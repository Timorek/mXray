import axios, { type AxiosInstance } from 'axios';
import type { Config, XrayCloudToken } from '../types.js';

const XRAY_BASE_URL = 'https://xray.cloud.getxray.app/api/v2';
const TOKEN_CACHE_DURATION = 50 * 60 * 1000; // 50 min
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;   // 5 min

export class XrayCloudService {
  private static instance: XrayCloudService | null = null;
  private token: XrayCloudToken | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly httpClient: AxiosInstance;

  private constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.httpClient = axios.create({ baseURL: XRAY_BASE_URL });
  }

  static getInstance(config: Config): XrayCloudService {
    if (!XrayCloudService.instance) {
      if (!config.XRAY_CLIENT_ID || !config.XRAY_CLIENT_SECRET) {
        throw new Error('Xray credentials not configured');
      }
      XrayCloudService.instance = new XrayCloudService(
        config.XRAY_CLIENT_ID,
        config.XRAY_CLIENT_SECRET,
      );
    }
    return XrayCloudService.instance;
  }

  static isConfigured(config: Config): boolean {
    return !!(config.XRAY_CLIENT_ID && config.XRAY_CLIENT_SECRET);
  }

  static resetInstance(): void {
    XrayCloudService.instance = null;
  }

  // ── Authentication ──────────────────────────────────────────────────────

  async authenticate(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - TOKEN_EXPIRY_BUFFER) {
      return this.token.token;
    }

    const response = await axios.post<string>(
      `${XRAY_BASE_URL}/authenticate`,
      { client_id: this.clientId, client_secret: this.clientSecret },
    );

    this.token = {
      token: response.data,
      expiresAt: Date.now() + TOKEN_CACHE_DURATION,
    };

    return this.token.token;
  }

  private invalidateToken(): void {
    this.token = null;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.authenticate();
    return { Authorization: `Bearer ${token}` };
  }

  // ── GraphQL ─────────────────────────────────────────────────────────────

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    try {
      const headers = await this.authHeaders();
      const body = variables ? { query, variables } : { query };
      const response = await this.httpClient.post<{ data: T; errors?: unknown[] }>(
        '/graphql',
        body,
        { headers },
      );
      if (response.data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }
      return response.data.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.invalidateToken();
      }
      throw error;
    }
  }

  async getTest(testKey: string) {
    const query = `query GetTest($jql: String!) {
      getTests(jql: $jql, limit: 1) {
        results {
          issueId
          testType { name kind }
          gherkin
          unstructured
          jira(fields: ["key", "summary"])
        }
      }
    }`;
    type Result = { getTests: { results: Array<Record<string, unknown>> } };
    const data = await this.graphql<Result>(query, { jql: `key = ${testKey}` });
    return data.getTests.results[0] ?? null;
  }

  async getTestWithSteps(testKey: string) {
    const query = `query GetTestWithSteps($jql: String!) {
      getTests(jql: $jql, limit: 1) {
        results {
          issueId
          testType { name kind }
          steps {
            id
            action
            data
            result
          }
          gherkin
          unstructured
          jira(fields: ["key", "summary"])
        }
      }
    }`;
    type Result = { getTests: { results: Array<Record<string, unknown>> } };
    const data = await this.graphql<Result>(query, { jql: `key = ${testKey}` });
    return data.getTests.results[0] ?? null;
  }

  async updateTestType(issueId: string, testTypeName: string) {
    const mutation = `mutation UpdateTestType($issueId: String!, $testType: UpdateTestTypeInput!) {
      updateTestType(issueId: $issueId, testType: $testType) {
        issueId
        testType { name kind }
      }
    }`;
    return this.graphql(mutation, { issueId, testType: { name: testTypeName } });
  }

  async updateGherkinTestDefinition(issueId: string, gherkin: string) {
    const mutation = `mutation UpdateGherkinTestDefinition($issueId: String!, $gherkin: String!) {
      updateGherkinTestDefinition(issueId: $issueId, gherkin: $gherkin) {
        issueId
        gherkin
      }
    }`;
    return this.graphql(mutation, { issueId, gherkin });
  }

  async addTestsToTestSet(issueId: string, testIssueIds: string[]) {
    const mutation = `mutation AddTestsToTestSet($issueId: String!, $testIssueIds: [String!]!) {
      addTestsToTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }`;
    return this.graphql(mutation, { issueId, testIssueIds });
  }

  async addTestsToTestPlan(issueId: string, testIssueIds: string[]) {
    const mutation = `mutation AddTestsToTestPlan($issueId: String!, $testIssueIds: [String!]!) {
      addTestsToTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }`;
    return this.graphql(mutation, { issueId, testIssueIds });
  }

  async getTestPlan(issueId: string) {
    const query = `query GetTestPlan($issueId: String!) {
      getTestPlan(issueId: $issueId) {
        issueId
        tests(limit: 100) {
          total
          results {
            issueId
            testType { name }
            jira(fields: ["key", "summary"])
          }
        }
        jira(fields: ["key", "summary"])
      }
    }`;
    type Result = { getTestPlan: Record<string, unknown> };
    const data = await this.graphql<Result>(query, { issueId });
    return data.getTestPlan;
  }

  async getTestSet(issueId: string) {
    const query = `query GetTestSet($issueId: String!) {
      getTestSet(issueId: $issueId) {
        issueId
        tests(limit: 100) {
          total
          results {
            issueId
            testType { name }
            jira(fields: ["key", "summary"])
          }
        }
        jira(fields: ["key", "summary"])
      }
    }`;
    type Result = { getTestSet: Record<string, unknown> };
    const data = await this.graphql<Result>(query, { issueId });
    return data.getTestSet;
  }

  async addTestsToTestExecution(issueId: string, testIssueIds: string[]) {
    const mutation = `mutation AddTestsToTestExecution($issueId: String!, $testIssueIds: [String!]!) {
      addTestsToTestExecution(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }`;
    return this.graphql(mutation, { issueId, testIssueIds });
  }

  async getTestExecution(issueId: string) {
    const query = `query GetTestExecution($issueId: String!) {
      getTestExecution(issueId: $issueId) {
        issueId
        tests(limit: 100) {
          total
          results {
            issueId
            testType { name }
            jira(fields: ["key", "summary"])
          }
        }
        jira(fields: ["key", "summary"])
      }
    }`;
    type Result = { getTestExecution: Record<string, unknown> };
    const data = await this.graphql<Result>(query, { issueId });
    return data.getTestExecution;
  }

  async getTestRun(testIssueId: string, testExecIssueId: string) {
    const query = `query GetTestRun($testIssueId: String!, $testExecIssueId: String!) {
      getTestRun(testIssueId: $testIssueId, testExecIssueId: $testExecIssueId) {
        id
        status { name color description }
        gherkin
        steps {
          action
          data
          result
          status { name color }
        }
      }
    }`;
    type Result = { getTestRun: { id: string; status: { name: string } } | null };
    const data = await this.graphql<Result>(query, { testIssueId, testExecIssueId });
    return data.getTestRun;
  }

  async updateTestRunStatus(testRunId: string, status: string) {
    const mutation = `mutation UpdateTestRunStatus($id: String!, $status: String!) {
      updateTestRunStatus(id: $id, status: $status)
    }`;
    return this.graphql(mutation, { id: testRunId, status });
  }

  async updateTestRunComment(testRunId: string, comment: string) {
    const mutation = `mutation UpdateTestRunComment($id: String!, $comment: String!) {
      updateTestRunComment(id: $id, comment: $comment)
    }`;
    return this.graphql(mutation, { id: testRunId, comment });
  }

  // ── REST Imports ────────────────────────────────────────────────────────

  async importExecutionResults(results: unknown) {
    const headers = await this.authHeaders();
    try {
      const response = await this.httpClient.post('/import/execution', results, {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Xray API error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async importCucumberResults(results: unknown, projectKey?: string) {
    const headers = await this.authHeaders();
    const boundary = '----XrayCucumberImport' + Date.now();
    const jsonStr = typeof results === 'string' ? results : JSON.stringify(results);
    const info = JSON.stringify({
      fields: {
        project: { key: projectKey ?? 'DEFAULT' },
        summary: 'Cucumber Test Execution',
        issuetype: { name: 'Test Execution' },
      },
    });
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="results"; filename="results.json"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      jsonStr + `\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="info"; filename="info.json"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      info + `\r\n` +
      `--${boundary}--\r\n`;
    try {
      const response = await this.httpClient.post('/import/execution/cucumber/multipart', body, {
        headers: { ...headers, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Xray API error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async importJUnitResults(xmlContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    try {
      const response = await this.httpClient.post('/import/execution/junit', xmlContent, {
        headers: { ...headers, 'Content-Type': 'text/xml' },
        params: queryParams,
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Xray API error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async importTestNGResults(xmlContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    try {
      const response = await this.httpClient.post('/import/execution/testng', xmlContent, {
        headers: { ...headers, 'Content-Type': 'text/xml' },
        params: queryParams,
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Xray API error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async importNUnitResults(xmlContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    try {
      const response = await this.httpClient.post('/import/execution/nunit', xmlContent, {
        headers: { ...headers, 'Content-Type': 'text/xml' },
        params: queryParams,
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Xray API error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async importRobotResults(xmlContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    try {
      const response = await this.httpClient.post('/import/execution/robot', xmlContent, {
        headers: { ...headers, 'Content-Type': 'text/xml' },
        params: queryParams,
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Xray API error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async importBehaveResults(results: unknown) {
    const headers = await this.authHeaders();
    try {
      const response = await this.httpClient.post('/import/execution/behave', results, {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Xray API error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async importFeatureFile(featureContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    const boundary = '----XrayFeatureImport' + Date.now();
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="import.feature"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      featureContent + `\r\n` +
      `--${boundary}--\r\n`;
    try {
      const response = await this.httpClient.post('/import/feature', body, {
        headers: { ...headers, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        params: queryParams,
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Xray API error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  // ── REST Export ─────────────────────────────────────────────────────────

  async exportCucumberFeatures(testKeys?: string) {
    const headers = await this.authHeaders();
    try {
      const response = await this.httpClient.get('/export/cucumber', {
        headers,
        params: testKeys ? { keys: testKeys } : undefined,
        responseType: 'arraybuffer',
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data;
        const message = Buffer.isBuffer(data)
          ? data.toString('utf-8')
          : (data instanceof ArrayBuffer ? Buffer.from(new Uint8Array(data)).toString('utf-8') : JSON.stringify(data));
        throw new Error(`Xray API error ${error.response.status}: ${message}`);
      }
      throw error;
    }
  }
}
