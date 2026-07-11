import * as fs from 'fs'
import * as path from 'path'
import { ScenarioResult } from './config'

export async function generateReport(results: ScenarioResult[]) {
  const reportsDir = path.join(__dirname, 'reports')

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  const total = results.length
  const passed = results.filter((r) => r.passed).length
  const failed = total - passed
  const successRate = ((passed / total) * 100).toFixed(2)

  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      successRate: `${successRate}%`,
    },
    results,
  }

  // Generate JSON
  fs.writeFileSync(
    path.join(reportsDir, 'validation-report.json'),
    JSON.stringify(reportData, null, 2)
  )

  // Generate Markdown
  let md = `# Production Validation Report\n\n`
  md += `**Date:** ${reportData.timestamp}\n`
  md += `**Success Rate:** ${successRate}%\n\n`
  md += `| Scenario | Status | Duration (ms) | Details |\n`
  md += `|---|---|---|---|\n`

  for (const r of results) {
    const statusIcon = r.passed ? '✅ PASS' : '❌ FAIL'
    md += `| ${r.scenarioName} | ${statusIcon} | ${r.durationMs} | ${r.failureDetail || '-'} |\n`
  }

  fs.writeFileSync(path.join(reportsDir, 'validation-report.md'), md)

  console.log(`\n📊 Validation Report Generated: ${successRate}% Success Rate`)
  console.log(`   Location: ${reportsDir}`)
}
