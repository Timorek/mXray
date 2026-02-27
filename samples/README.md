# Sample Files

Example test reports for testing import tools:

| File | Tool | Description |
|---|---|---|
| `cucumber-report.json` | `import_cucumber_results` | Cucumber JSON report |
| `login.feature` | `import_feature_file` | Cucumber feature file |
| `testng-report.xml` | `import_testng_results` | TestNG XML report |
| `nunit-report.xml` | `import_nunit_results` | NUnit XML report |
| `robot-report.xml` | `import_robot_results` | Robot Framework XML report |
| `behave-report.json` | `import_behave_results` | Behave JSON report |

## Usage

Each file can be used with the corresponding MCP tool. Pass the file content as a string argument:

```bash
# Example: import JUnit results
cat samples/testng-report.xml | ...
```

Or reference the file content directly from your AI assistant when calling the tool.
