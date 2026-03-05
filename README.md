# mXray

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that connects AI-powered IDEs to **Xray Test Management for Jira Cloud**. It exposes 27 test management tools over stdio, letting your AI assistant create and manage tests, test executions, test plans, test sets, and import/export test results — all without leaving your editor.

## Prerequisites

- **Node.js** ≥ 18
- A **Jira Cloud** account with the [Xray for Jira](https://www.getxray.app/) app installed
- A **Jira API token** — generate one at [Atlassian account settings](https://id.atlassian.com/manage-profile/security/api-tokens)
- _(Optional)_ **Xray Cloud API credentials** (client ID + secret) — required for Xray-specific tools such as fetching test steps, updating test runs, and importing/exporting results. Generate them in Xray → **Settings → API Keys**.

> **Without Xray credentials**, 9 Jira-only tools still work fully. The remaining 18 Xray-specific tools will return a clear error message when called.

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/mXray.git
cd mXray

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see Configuration below)

# 4. Build
npm run build
```

## Configuration

Edit the `.env` file created above:

```env
# Required
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token

# Optional — enables Xray-specific tools (GraphQL, import/export)
XRAY_CLIENT_ID=your-xray-client-id
XRAY_CLIENT_SECRET=your-xray-client-secret
```

The server validates all variables at startup using strict Zod schemas and exits with a descriptive error if anything is missing or malformed.

## Usage

The server communicates over **stdio** and must be registered with your MCP-compatible IDE. All startup logs are written to `stderr` to keep the stdio channel clean.

### GitHub Copilot CLI

Add to `~/.copilot/mcp-config.json` (global) or `.copilot/mcp-config.json` (project-local):

**Option A — inline credentials:**

```json
{
  "mcpServers": {
    "mxray": {
      "command": "node",
      "args": ["/absolute/path/to/mXray/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-jira-api-token",
        "XRAY_CLIENT_ID": "your-xray-client-id",
        "XRAY_CLIENT_SECRET": "your-xray-client-secret"
      }
    }
  }
}
```

**Option B — load from `.env` file (recommended):**

```json
{
  "mcpServers": {
    "mxray": {
      "command": "node",
      "args": ["--env-file=/absolute/path/to/mXray/.env", "/absolute/path/to/mXray/dist/index.js"]
    }
  }
}
```

> `--env-file` is supported natively by Node.js ≥ 20.6. For Node 18/19, use the `.env` file approach by keeping a populated `.env` in the project root — the server loads it automatically via `dotenv`.

### Claude Code

Add to `~/.claude/mcp_settings.json`:

**Option A — inline credentials:**

```json
{
  "mcpServers": {
    "mxray": {
      "command": "node",
      "args": ["/absolute/path/to/mXray/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-jira-api-token",
        "XRAY_CLIENT_ID": "your-xray-client-id",
        "XRAY_CLIENT_SECRET": "your-xray-client-secret"
      }
    }
  }
}
```

**Option B — load from `.env` file (recommended):**

```json
{
  "mcpServers": {
    "mxray": {
      "command": "node",
      "args": ["--env-file=/absolute/path/to/mXray/.env", "/absolute/path/to/mXray/dist/index.js"]
    }
  }
}
```

### Development (no build required)

```bash
npm run dev
```

To use the dev server in an MCP config, replace `node dist/index.js` with `npx tsx src/index.ts`.

## Available Tools

Tools marked with *(Xray)* require `XRAY_CLIENT_ID` and `XRAY_CLIENT_SECRET`.

### Tests

| Tool | Description |
|---|---|
| `list_tests` | List tests in a project; filter by label or component |
| `get_test` | Get details of a specific test |
| `get_test_with_steps` | Get test details including manual steps *(Xray)* |
| `create_test` | Create a test (Manual / Cucumber / Generic) |
| `update_test` | Update test fields (summary, description, labels, priority) |
| `update_test_type` | Change the Xray test type *(Xray)* |
| `update_gherkin_test_definition` | Update the Gherkin scenario on a Cucumber test *(Xray)* |

### Test Executions

| Tool | Description |
|---|---|
| `list_test_executions` | List test executions in a project |
| `get_test_execution` | Get execution details and test runs |
| `create_test_execution` | Create a new test execution |
| `update_test_run` | Update a test run status and comment *(Xray)* |

### Test Plans

| Tool | Description |
|---|---|
| `list_test_plans` | List test plans in a project |
| `get_test_plan` | Get plan details and associated tests |
| `create_test_plan` | Create a new test plan |
| `add_tests_to_test_plan` | Add tests to a plan *(Xray)* |

### Test Sets

| Tool | Description |
|---|---|
| `list_test_sets` | List test sets in a project |
| `get_test_set` | Get set details and associated tests |
| `create_test_set` | Create a new test set |
| `add_tests_to_test_set` | Add tests to a set *(Xray)* |

### Import

All import tools require Xray credentials.

| Tool | Format |
|---|---|
| `import_execution_results` | Xray JSON |
| `import_cucumber_results` | Cucumber JSON |
| `import_junit_results` | JUnit XML |
| `import_testng_results` | TestNG XML |
| `import_nunit_results` | NUnit XML |
| `import_robot_results` | Robot Framework XML |
| `import_behave_results` | Behave JSON |
| `import_feature_file` | Gherkin `.feature` file |

### Export

| Tool | Description |
|---|---|
| `export_cucumber_features` | Export Cucumber feature files as a base64-encoded ZIP *(Xray)* |

Sample test report files for testing the import tools are in [`samples/`](samples/).

## Development

```bash
npm run dev         # Run with tsx — no build step needed
npm run build       # Compile TypeScript → dist/
npm run typecheck   # Type-check without emitting files
npm test            # Run tests with Vitest
npm run test:watch  # Run tests in watch mode
```

## Project Structure

```
mXray/
├── src/
│   ├── index.ts                  # Entry point: config, clients, tool registration
│   ├── types.ts                  # Zod config schema + TypeScript interfaces
│   ├── utils/errors.ts           # Centralized API error formatting
│   ├── services/
│   │   └── XrayCloudService.ts   # Xray JWT auth, GraphQL queries, REST imports
│   └── tools/
│       ├── tests/                # 7 test management tools
│       ├── test-executions/      # 4 test execution tools
│       ├── test-plans/           # 4 test plan tools
│       ├── test-sets/            # 4 test set tools
│       ├── import/               # 8 result import tools
│       └── export/               # 1 export tool
├── samples/                      # Example test report files
├── .env.example                  # Environment variable template
├── package.json
└── tsconfig.json
```

## License

[MIT](LICENSE) © 2026 Arkadiusz Kłos
