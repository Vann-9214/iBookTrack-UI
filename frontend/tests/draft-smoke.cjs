const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
;(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = [], requests = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'localhost' || url.pathname.startsWith('/api/')) { requests.push(url.href); return route.abort() }
    return route.continue()
  })
  const base = process.env.DEMO_URL || 'http://localhost:3000'
  try {
    await page.goto(`${base}/inventory`)
    await page.getByRole('button', { name: /Book Verification/ }).click()
    await page.getByRole('button', { name: 'Start Session', exact: true }).first().click()
    const input = page.getByPlaceholder('Scan barcode or ISBN here...')
    await input.fill('9780743273565'); await input.press('Enter')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('ibooktrack_demo_inventory_draft'))?.verifScannedBooks.length === 1)
    await page.reload()
    await input.waitFor()
    assert.ok((await page.locator('body').innerText()).includes('9780743273565'))
    console.log('INVENTORY DRAFT + RESTORED TAB OK')
    await page.goto(`${base}/endorsement`)
    await page.getByRole('button', { name: /^Endorsement \d+/ }).click()
    await page.getByRole('button', { name: 'Start Session', exact: true }).first().click()
    await page.getByRole('button', { name: 'Start Session', exact: true }).last().click()
    await input.fill('9780743273565'); await input.press('Enter')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('ibooktrack_demo_endorsement_draft'))?.inspScannedBooks.length === 1)
    await page.reload()
    await input.waitFor()
    assert.ok((await page.locator('body').innerText()).includes('9780743273565'))
    console.log('ENDORSEMENT DRAFT + RESTORED TAB OK')
    assert.deepEqual(errors,[])
    assert.deepEqual(requests,[])
  } finally {
    if (errors.length || requests.length) console.log(JSON.stringify({errors,requests}))
    await browser.close()
  }
})().catch(e=>{console.error(e);process.exitCode=1})
