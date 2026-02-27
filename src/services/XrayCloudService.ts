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
      const response = await this.httpClient.post<{ data: T; errors?: unknown[] }>(
        '/graphql',
        { query, variables },
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
    const query = `
      query($jql: String!) {
        getTests(jql: $jql, limit: 1) {
          results {
            issueId
            testType { name kind }
            gherkin
            unstructured
            jira(fields: ["key", "summary"])
          }
        }
      }
    `;
    type Result = { getTests: { results: Array<Record<string, unknown>> } };
    const data = await this.graphql<Result>(query, { jql: `key = ${testKey}` });
    return data.getTests.results[0] ?? null;
  }

  async getTestWithSteps(testKey: string) {
    const query = `
      query($jql: String!) {
        getTests(jql: $jql, limit: 1) {
          results {
            issueId
            testType { name kind }
            steps { steps { id action data result } }
            gherkin
            unstructured
            jira(fields: ["key", "summary"])
          }
        }
      }
    `;
    type Result = { getTests: { results: Array<Record<string, unknown>> } };
    const data = await this.graphql<Result>(query, { jql: `key = ${testKey}` });
    return data.getTests.results[0] ?? null;
  }

  async updateTestType(issueId: string, testTypeName: string) {
    const mutation = `
      mutation($issueId: String!, $testType: UpdateTestTypeInput!) {
        updateTestType(issueId: $issueId, testType: $testType)
      }
    `;
    return this.graphql(mutation, { issueId, testType: { name: testTypeName } });
  }

  async updateGherkinTestDefinition(issueId: string, gherkin: string) {
    const mutation = `
      mutation($issueId: String!, $gherkin: String!) {
        updateGherkinTestDefinition(issueId: $issueId, gherkin: $gherkin)
      }
    `;
    return this.graphql(mutation, { issueId, gherkin });
  }

  async addTestsToTestSet(issueId: string, testIssueIds: string[]) {
    const mutation = `
      mutation($issueId: String!, $testIssueIds: [String!]!) {
        addTestsToTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
          addedTests
          warning
        }
      }
    `;
    return this.graphql(mutation, { issueId, testIssueIds });
  }

  // ── REST Imports ────────────────────────────────────────────────────────

  async importExecutionResults(results: unknown) {
    const headers = await this.authHeaders();
    const response = await this.httpClient.post('/import/execution', results, {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
    return response.data;
  }

  async importCucumberResults(results: unknown) {
    const headers = await this.authHeaders();
    const response = await this.httpClient.post('/import/execution/cucumber', results, {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
    return response.data;
  }

  async importJUnitResults(xmlContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    const response = await this.httpClient.post('/import/execution/junit', xmlContent, {
      headers: { ...headers, 'Content-Type': 'text/xml' },
      params: queryParams,
    });
    return response.data;
  }

  async importTestNGResults(xmlContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    const response = await this.httpClient.post('/import/execution/testng', xmlContent, {
      headers: { ...headers, 'Content-Type': 'text/xml' },
      params: queryParams,
    });
    return response.data;
  }

  async importNUnitResults(xmlContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    const response = await this.httpClient.post('/import/execution/nunit', xmlContent, {
      headers: { ...headers, 'Content-Type': 'text/xml' },
      params: queryParams,
    });
    return response.data;
  }

  async importRobotResults(xmlContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    const response = await this.httpClient.post('/import/execution/robot', xmlContent, {
      headers: { ...headers, 'Content-Type': 'text/xml' },
      params: queryParams,
    });
    return response.data;
  }

  async importBehaveResults(results: unknown) {
    const headers = await this.authHeaders();
    const response = await this.httpClient.post('/import/execution/behave', results, {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
    return response.data;
  }

  async importFeatureFile(featureContent: string, queryParams?: Record<string, string>) {
    const headers = await this.authHeaders();
    const response = await this.httpClient.post('/import/feature', featureContent, {
      headers: { ...headers, 'Content-Type': 'text/plain' },
      params: queryParams,
    });
    return response.data;
  }

  // ── REST Export ─────────────────────────────────────────────────────────

  async exportCucumberFeatures(testKeys?: string) {
    const headers = await this.authHeaders();
    const response = await this.httpClient.get('/export/cucumber', {
      headers,
      params: testKeys ? { keys: testKeys } : undefined,
      responseType: 'arraybuffer',
    });
    return response.data;
  }
}
