const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
;(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1920, height: 650 } })
  try {
    await page.addInitScript(() => localStorage.setItem('ibooktrack_demo_warehouse_draft', JSON.stringify({
      activeLot: 'LOT-2026-001', selectedBox: '12/32', currentBoxNumber: '12/32',
      currentSession: { id: 'scroll-check-session', status: 'in_progress', type: 'mustang', total_scanned_books: 0, total_processable: 0, total_non_processable: 0 },
      scannedBooks: [], issues: [], totalBooksExpected: '',
    })))
    await page.goto(`${process.env.DEMO_URL || 'http://localhost:3000'}/warehouse`)
    await page.getByText('Active scanning session', { exact: true }).waitFor()
    const content = page.locator('main > .ambient-bg')
    const nav = page.locator('aside nav')
    assert.equal(await content.evaluate(el => getComputedStyle(el).overflowY), 'auto', 'Active Warehouse content should scroll on desktop')
    assert.equal(await nav.evaluate(el => getComputedStyle(el).scrollbarWidth), 'none', 'Sidebar native scrollbar should be hidden')
    await content.evaluate(el => { el.scrollTop = 0 })
    const navStart = await nav.evaluate(el => el.scrollTop)
    await content.hover({ position: { x: 600, y: 250 } })
    await page.mouse.wheel(0, 400)
    await page.waitForFunction(() => document.querySelector('main > .ambient-bg').scrollTop > 0)
    assert.equal(await nav.evaluate(el => el.scrollTop), navStart, 'Page scrolling must not scroll the sidebar')
    await nav.hover()
    await nav.evaluate(el => { el.scrollTop = 0 })
    await page.mouse.wheel(0, 400)
    await page.waitForFunction(() => document.querySelector('aside nav').scrollTop > 0)
    console.log('PASS: right-side content scrolls; sidebar scrollbar hidden and menu still scrollable')

    await page.goto(`${process.env.DEMO_URL || 'http://localhost:3000'}/inventory`)
    await page.getByRole('button', { name: /Book Verification/ }).click()
    await page.getByRole('button', { name: 'Start Session', exact: true }).first().click()
    await page.getByPlaceholder('Scan barcode or ISBN here...').waitFor()
    const inventory = page.locator('main.ambient-bg')
    assert.equal(await inventory.evaluate(el => getComputedStyle(el).overflowY), 'auto', 'Inventory verification must remain scrollable')
    await inventory.evaluate(el => { el.scrollTop = 0 })
    await inventory.hover({ position: { x: 600, y: 250 } })
    await page.mouse.wheel(0, 400)
    await page.waitForFunction(() => document.querySelector('main.ambient-bg').scrollTop > 0)
    const bottom = await inventory.evaluate(el => {
      el.scrollTop = el.scrollHeight
      return el.scrollHeight - el.clientHeight - el.scrollTop
    })
    assert.ok(bottom < 2, 'The bottom of the verification session must be reachable')
    console.log('PASS: Inventory session scrolls to the bottom')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
