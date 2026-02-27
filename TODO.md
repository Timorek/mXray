# TODO

## Missing Tools

### create_test_set
- **Domain**: test-sets
- **File**: `src/tools/test-sets/createTestSet.ts`
- **Description**: Create a new Test Set issue in Jira
- **Similar to**: `createTestPlan.ts` — uses Jira REST API `POST /rest/api/3/issue` with `issuetype.name = "Test Set"`
- **Input**: `project_key` (required), `summary` (required), `description` (optional)
- **No Xray credentials required**
- **After implementing**: register in `index.ts` — total tool count will be 28

## Improvements
- [ ] Add JUnit sample file to `samples/` directory (`samples/junit-report.xml`)

## Notes
- All other planned tools from the original spec are implemented and verified
