import { runBundledGenerationScenarios } from '../src/developer/generator-scenarios';

const report = runBundledGenerationScenarios();
const summary = {
  schema_version: report.schema_version,
  valid: report.valid,
  total: report.total,
  passed: report.passed,
  failed: report.failed,
  issue_codes: report.issue_codes,
  coverage: report.coverage,
};

console.info(JSON.stringify(summary, null, 2));

if (!report.valid) {
  report.results
    .filter((result) => !result.passed)
    .slice(0, 10)
    .forEach((result) =>
      console.error(`${result.scenario_id}: ${result.result_code}`),
    );
  process.exitCode = 1;
}
