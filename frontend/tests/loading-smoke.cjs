const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
;(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const base = process.env.DEMO_URL || 'http://localhost:3000'
  try {
    await page.goto(`${base}/Dashboard`)
    await page.locator('nav a[href="/inventory"]').first().waitFor()
    await page.route('**/inventory?*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      await route.continue()
    })
    const click = page.locator('nav a[href="/inventory"]').first().click()
    const loader = page.getByText('Transferring...', { exact: true })
    await loader.waitFor({ state: 'visible', timeout: 5000 })
    assert.equal(await loader.evaluate(el => getComputedStyle(el.parentElement).position), 'fixed')
    await click
    await page.waitForURL('**/inventory')
    await loader.waitFor({ state: 'hidden' })
    await page.locator('nav a[href="/inventory"]').first().click()
    assert.equal(await loader.count(), 0, 'Current-page clicks should not leave a loading overlay')
    console.log('PASS: transferring overlay appears during navigation and clears on arrival')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
