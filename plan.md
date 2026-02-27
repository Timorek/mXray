# MCP Server — Xray Test Management dla Jira Cloud

## Kontekst

Projekt to serwer MCP (Model Context Protocol), który integruje edytor kodu (np. Cursor IDE) z Xray Test Management dla Jira Cloud. Pozwala AI asystentowi zarządzać testami bezpośrednio z IDE — tworzyć testy, uruchamiać egzekucje, importować wyniki CI/CD — bez wychodzenia z edytora.

---

## Cel

Napisać serwer MCP w TypeScript (Node.js), który:

- Nasłuchuje na stdio i odpowiada na wywołania narzędzi MCP
- Łączy się z Jira REST API v3 (operacje CRUD na issuach)
- Łączy się z Xray Cloud API v2 (GraphQL + REST dla kroków testowych i importu wyników)
- Eksponuje 27 narzędzi MCP zgrupowanych domenowo

---

## Stack technologiczny

| Element | Technologia |
|---|---|
| Runtime | Node.js (ESM, TypeScript strict, target ES2022) |
| MCP SDK | `@modelcontextprotocol/sdk ^0.4.0` |
| HTTP | `axios ^1.6.0` |
| Walidacja konfiguracji | `zod ^3.22.0` |
| Dev | `tsx` (bezpośredni run TS), `typescript` |
| Moduły | `.js` extensions wymagane w importach (ESM) |

---

## Konfiguracja (zmienne środowiskowe)

Walidowane via Zod przy starcie:

| Zmienna | Wymagana | Opis |
|---|---|---|
| `JIRA_BASE_URL` | TAK | URL instancji Jira (np. `https://firma.atlassian.net`) |
| `JIRA_EMAIL` | TAK | Email konta Jira |
| `JIRA_API_TOKEN` | TAK | API token z Atlassian Account Settings |
| `XRAY_CLIENT_ID` | NIE | Client ID z Xray Cloud API Keys |
| `XRAY_CLIENT_SECRET` | NIE | Client Secret z Xray Cloud API Keys |

> Bez Xray credentials działają tylko narzędzia CRUD. Z credentials — wszystkie 27 narzędzi.

---

## Architektura

### Dualny system API

**1. Jira REST API v3**
- Auth: Basic `base64(email:api_token)` w nagłówku
- Cel: CRUD na issuach (testy, egzekucje, plany, zestawy)
- Axios instance pre-konfigurowany w `index.ts`

**2. Xray Cloud API v2** (`xray.cloud.getxray.app/api/v2`)
- Auth: JWT Bearer (client_id + client_secret → `POST /authenticate` → token)
- Token cache: 50 minut, auto-refresh, invalidacja przy 401
- Cel: pobieranie kroków testowych (GraphQL), import/export wyników (REST)
- Zarządzany przez singleton `XrayCloudService`

### Wzorzec narzędzia (Tool Pattern)

Każde narzędzie w `src/tools/<domena>/<nazwa>.ts` eksportuje dokładnie dwie rzeczy:

```typescript
// 1. Definicja narzędzia
export const <name>Tool = {
  name: 'snake_case_name',
  description: 'Opis dla AI',
  inputSchema: { type: 'object', properties: {}, required: [] }
};

// 2. Handler
export async function <name>(
  axiosInstance: AxiosInstance,
  config: Config,
  args: any
): Promise<MCPResponse>
```

Rejestracja w `index.ts`:
- Definicja → tablica `tools` w handlerze `ListToolsRequestSchema`
- Handler → mapa `handlers` w handlerze `CallToolRequestSchema` (klucz: snake_case)

---

## Struktura plików

```
src/
├── index.ts                          # Punkt wejścia: walidacja env, axios, dispatch narzędzi
├── types.ts                          # Interfejsy TS + ConfigSchema (Zod)
├── services/
│   └── XrayCloudService.ts           # Singleton: JWT auth, GraphQL, REST
└── tools/
    ├── tests/
    │   ├── listTests.ts
    │   ├── getTest.ts
    │   ├── getTestWithSteps.ts        # GraphQL getTests query
    │   ├── createTest.ts
    │   ├── updateTest.ts
    │   ├── updateTestType.ts          # GraphQL mutation
    │   └── updateGherkinTestDefinition.ts  # GraphQL mutation
    ├── test-executions/
    │   ├── listTestExecutions.ts
    │   ├── getTestExecution.ts
    │   ├── createTestExecution.ts
    │   └── updateTestRun.ts
    ├── test-plans/
    │   ├── listTestPlans.ts
    │   ├── getTestPlan.ts
    │   ├── createTestPlan.ts
    │   └── addTestsToTestPlan.ts
    ├── test-sets/
    │   ├── listTestSets.ts
    │   ├── getTestSet.ts
    │   └── addTestsToTestSet.ts       # GraphQL mutation
    ├── import/
    │   ├── importExecutionResults.ts  # Xray JSON format
    │   ├── importCucumberResults.ts
    │   ├── importJUnitResults.ts
    │   ├── importTestNGResults.ts
    │   ├── importNUnitResults.ts
    │   ├── importRobotResults.ts
    │   ├── importBehaveResults.ts
    │   └── importFeatureFile.ts
    └── export/
        └── exportCucumberFeatures.ts
```

---

## Wszystkie 27 narzędzi MCP

### Tests (7)

| Narzędzie | Opis | Xray? |
|---|---|---|
| `list_tests` | Lista testów w projekcie (JQL: labels, component, max_results) | NIE |
| `get_test` | Szczegóły testu z Jira REST | NIE |
| `get_test_with_steps` | Szczegóły + kroki testowe (GraphQL getTests) | TAK |
| `create_test` | Utwórz test (Manual/Cucumber/Generic) | NIE |
| `update_test` | Edytuj pola testu | NIE |
| `update_test_type` | Zmień typ testu (GraphQL mutation) | TAK |
| `update_gherkin_test_definition` | Zaktualizuj scenariusz Gherkin (GraphQL mutation) | TAK |

### Test Executions (4)

| Narzędzie | Opis | Xray? |
|---|---|---|
| `list_test_executions` | Lista egzekucji w projekcie | NIE |
| `get_test_execution` | Szczegóły egzekucji z listą runs | NIE |
| `create_test_execution` | Utwórz sesję egzekucji | NIE |
| `update_test_run` | Zapisz wynik testu (PASS/FAIL/TODO/EXECUTING/ABORTED) | NIE |

### Test Plans (4)

| Narzędzie | Opis | Xray? |
|---|---|---|
| `list_test_plans` | Lista planów testów | NIE |
| `get_test_plan` | Szczegóły planu z testami | NIE |
| `create_test_plan` | Utwórz plan testów | NIE |
| `add_tests_to_test_plan` | Dodaj testy do planu | NIE |

### Test Sets (3)

| Narzędzie | Opis | Xray? |
|---|---|---|
| `list_test_sets` | Lista zestawów testów | NIE |
| `get_test_set` | Szczegóły zestawu z testami | NIE |
| `add_tests_to_test_set` | Dodaj testy do zestawu (GraphQL mutation) | TAK |

### Import (8) — wszystkie wymagają Xray

| Narzędzie | Format |
|---|---|
| `import_execution_results` | Xray JSON |
| `import_cucumber_results` | Cucumber JSON |
| `import_junit_results` | JUnit XML |
| `import_testng_results` | TestNG XML |
| `import_nunit_results` | NUnit XML |
| `import_robot_results` | Robot Framework XML |
| `import_behave_results` | Behave JSON |
| `import_feature_file` | Cucumber `.feature` |

### Export (1)

| Narzędzie | Opis | Xray? |
|---|---|---|
| `export_cucumber_features` | Eksportuj feature files z Xray | TAK |

---

## XrayCloudService — szczegóły implementacji

```typescript
class XrayCloudService {
  private static instance: XrayCloudService;
  private token: XrayCloudToken | null = null;
  private readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;  // 5 min
  private readonly TOKEN_CACHE_DURATION = 50 * 60 * 1000; // 50 min

  static getInstance(config: Config): XrayCloudService
  isConfigured(): boolean
  async authenticate(): Promise<string>  // cache + auto-refresh

  // GraphQL:
  async getTest(testKey: string): Promise<...>
  async getTestWithSteps(testKey: string): Promise<...>
  async updateTestType(issueId: string, testTypeName: string): Promise<...>
  async updateGherkinTestDefinition(issueId: string, gherkin: string): Promise<...>
  async addTestsToTestSet(issueId: string, testIssueIds: string[]): Promise<...>

  // REST:
  async importExecutionResults(results: any): Promise<...>
  async importCucumberResults(results: any): Promise<...>
  async importJUnitResults(xmlContent: string): Promise<...>
  // ... (analogicznie dla TestNG, NUnit, Robot, Behave)
  async importFeatureFile(featureContent: string): Promise<...>
  async exportCucumberFeatures(testKeys?: string): Promise<...>
}
```

> **Ważne:** Na odpowiedź 401 token jest nullowany → wymusi re-auth przy następnym wywołaniu.

---

## Typy (src/types.ts)

```typescript
// Config walidowany Zod
const ConfigSchema = z.object({
  JIRA_BASE_URL: z.string().url(),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string(),
  XRAY_CLIENT_ID: z.string().optional(),
  XRAY_CLIENT_SECRET: z.string().optional(),
});
type Config = z.infer<typeof ConfigSchema>;

// Odpowiedź MCP
type MCPResponse = { content: Array<{ type: 'text'; text: string }> };

// Enums
type XrayTestType = 'Manual' | 'Cucumber' | 'Generic';
type TestStatus = 'TODO' | 'EXECUTING' | 'PASS' | 'FAIL' | 'ABORTED';

// Interfaces:
// XrayTest, XrayTestStep, XrayTestRun, XrayTestExecution,
// XrayTestPlan, XrayTestSet, JiraIssue, JiraSearchResponse,
// TestImportResponse, XrayCloudToken, JiraUser, XrayPrecondition
```

---

## Kroki implementacji

1. **Init projektu** — `npm init`, zainstaluj zależności, skonfiguruj `tsconfig.json` (ESM, strict, ES2022), dodaj skrypty `build`/`dev`/`start`
2. **Typy** — zaimplementuj `src/types.ts` ze wszystkimi interfejsami i ConfigSchema
3. **XrayCloudService** — singleton z JWT auth, GraphQL i REST metodami
4. **index.ts** — walidacja env, axios instance (Basic Auth), StdioServerTransport, dispatch mapa
5. **Narzędzia** — implementuj domain po domenie: `tests → executions → plans → sets → import → export`
6. **Rejestracja** — po każdym narzędziu dodaj do `tools[]` i `handlers{}` w `index.ts`
7. **Build & test** — `npm run build`, przetestuj z prawdziwym Jira/Xray

---

## Weryfikacja

**1. Build**

```bash
npm run build
```

Musi skompilować bez błędów TS.

**2. Konfiguracja MCP klienta** (np. Cursor `mcp.json`)

```json
{
  "mcpServers": {
    "xray": {
      "command": "node",
      "args": ["/ścieżka/do/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://firma.atlassian.net",
        "JIRA_EMAIL": "email@firma.com",
        "JIRA_API_TOKEN": "token",
        "XRAY_CLIENT_ID": "id",
        "XRAY_CLIENT_SECRET": "secret"
      }
    }
  }
}
```

**3. Testy funkcjonalne**

- Wywołaj `list_tests` z `project_key` — powinien zwrócić listę testów
- Wywołaj `get_test_with_steps` — sprawdź kroki testowe (wymaga Xray credentials)
- Wywołaj `import_junit_results` z XML — sprawdź czy tworzy egzekucję w Jira