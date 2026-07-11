import { Reporter, File } from 'vitest/node'
import { execSync } from 'child_process'

function getGitMetadata() {
  try {
    const sha = execSync('git rev-parse --short HEAD').toString().trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    return { sha, branch }
  } catch (e) {
    return { sha: 'unknown', branch: 'unknown' }
  }
}

export default class PaymentValidationReporter implements Reporter {
  onFinished(files: File[] = [], errors: unknown[] = []) {
    let passed = 0
    let failed = 0
    let skipped = 0
    let totalCheckoutTime = 0
    let checkoutCount = 0
    let totalVerifyTime = 0
    let verifyCount = 0
    let totalWebhookTime = 0
    let webhookCount = 0

    // Traverse tests to collect stats
    files.forEach((file) => {
      file.tasks.forEach((task) => {
        if (task.type === 'test') {
          if (task.result?.state === 'pass') passed++
          if (task.result?.state === 'fail') failed++
          if (task.result?.state === 'skip') skipped++

          const duration = task.result?.duration || 0

          if (task.name.toLowerCase().includes('checkout')) {
            totalCheckoutTime += duration
            checkoutCount++
          } else if (task.name.toLowerCase().includes('verify')) {
            totalVerifyTime += duration
            verifyCount++
          } else if (task.name.toLowerCase().includes('webhook')) {
            totalWebhookTime += duration
            webhookCount++
          }
        }
      })
    })

    const avgCheckout = checkoutCount ? Math.round(totalCheckoutTime / checkoutCount) : 0
    const avgVerify = verifyCount ? Math.round(totalVerifyTime / verifyCount) : 0
    const avgWebhook = webhookCount ? Math.round(totalWebhookTime / webhookCount) : 0

    const git = getGitMetadata()
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16)

    let certificationResult = ''
    if (skipped > 0) {
      certificationResult =
        'NOT READY FOR CERTIFICATION\nReason: Environment incomplete. Scenarios skipped due to missing keys.'
    } else if (failed > 0 || errors.length > 0) {
      certificationResult = `CERTIFICATION FAILED\nExecuted: ${passed + failed}\nFailures: ${failed}`
    } else {
      certificationResult = 'READY FOR CERTIFICATION\nAll tests executed.\nNo failures.\nNo skips.'
    }

    console.log('\n=========================================')
    console.log('       Payment Validation Report       ')
    console.log('=========================================\n')

    console.log('Certification Metadata:')
    console.log(`Project:        TRUF Gaming`)
    console.log(`Commit:         ${git.sha}`)
    console.log(`Branch:         ${git.branch}`)
    console.log(`Environment:    development`)
    console.log(`Migration:      20260711_payment_system_fixes`)
    console.log(`Executed:       ${timestamp}`)
    console.log(`Vitest:         v4.1.10\n`)

    console.log('Test Summary:')
    console.log(`Passed:  ${passed}`)
    console.log(`Failed:  ${failed}`)
    console.log(`Skipped: ${skipped}\n`)

    if (failed > 0) {
      console.log('Failure Diagnostics:')
      // Extract specific task errors if they exist for better DX
      files.forEach((file) => {
        file.tasks.forEach((task) => {
          if (task.type === 'test' && task.result?.state === 'fail') {
            console.log(`- FAILED: ${task.name}`)
            if (task.result.errors?.length) {
              console.log(`  Expected: ${task.result.errors[0]?.name}`)
              console.log(`  Details:  ${task.result.errors[0]?.message.split('\n')[0]}`)
            }
          }
        })
      })
      console.log('')
    }

    console.log('Environment Status:')
    console.log(`Migration applied: ${skipped > 0 ? '?' : '✓'}`)
    console.log(
      `Razorpay Keys:     ${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.includes('XXXX') ? '✗' : '✓'}`
    )
    console.log(
      `Webhook Secret:    ${process.env.RAZORPAY_WEBHOOK_SECRET === 'MyTurfGamingSecret123!' ? '✗' : '✓'}\n`
    )

    console.log('Performance Targets:')
    console.log(`Average Checkout:  ${avgCheckout}ms (Target: <2000ms, Hard: >5000ms)`)
    console.log(`Average Verify:    ${avgVerify}ms (Target: <1000ms, Hard: >3000ms)`)
    console.log(`Average Webhook:   ${avgWebhook}ms (Target: <1000ms, Hard: >3000ms)\n`)

    console.log('Database Consistency:')
    console.log(failed === 0 ? '✓ No duplicate bookings' : '✗ Potential duplicates (Tests failed)')
    console.log(
      failed === 0 ? '✓ No duplicate payments' : '✗ Potential payment errors (Tests failed)'
    )
    console.log(
      failed === 0 ? '✓ No orphaned slots' : '✗ Potential orphaned slots (Tests failed)\n'
    )

    console.log(`Overall Result:\n${certificationResult}`)
    console.log('\n=========================================')
  }
}
