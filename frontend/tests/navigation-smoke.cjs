// Use a production preview to measure actual navigation, without dev compilation.
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
;(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const errors = [], remote = [], prefetched = new Set()
  let beforeFirstClick = true
  page.on('pageerror', e => errors.push(e.message))
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') remote.push(url.href)
    if (beforeFirstClick && request.headers().rsc === '1') prefetched.add(url.pathname)
  })
  const base = process.env.DEMO_URL || 'http://localhost:3000'
  try {
    const warmInventory = process.env.CHECK_PREFETCH === '1'
      ? page.waitForResponse(response => new URL(response.url()).pathname === '/inventory' && response.request().headers().rsc === '1')
      : null
    await page.goto(`${base}/Dashboard`)
    const inventory = page.locator('nav a[href="/inventory"]').first()
    await inventory.waitFor({ timeout: 10000 })
    await inventory.hover()
    if (warmInventory) await warmInventory
    beforeFirstClick = false
    await page.waitForFunction(() => document.querySelector('nav a[href="/reports"]'))
    for (const [name, path] of [['Inventory','/inventory'],['Reports','/reports'],['Non-Processable','/non-processable'],['Warehouse','/warehouse'],['Inventory','/inventory']]) {
      const start = Date.now()
      await page.locator(`nav a[href="${path}"]`).first().click()
      await page.waitForURL(`**${path}`)
      await page.locator('nav a[href="/Dashboard"]').first().waitFor()
      console.log(JSON.stringify({ name, milliseconds: Date.now() - start }))
    }
    await page.locator('nav a[href="/reports"]').first().click()
    await page.waitForURL('**/reports')
    const downloaded = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    const report = await downloaded
    assert.ok(report.suggestedFilename().endsWith('.xlsx'))
    console.log('DEFERRED EXCEL EXPORT OK')
    await page.addInitScript(() => {
      window.print = () => {
        const canvas = document.querySelector('canvas')
        window.__printedBarcode = !!canvas?.getContext('2d')?.getImageData(0,0,canvas.width,canvas.height).data.some((v,i) => i % 4 === 3 && v > 0)
        window.dispatchEvent(new Event('afterprint'))
      }
    })
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('ibooktrack_demo_state'))
      state.lots[0].boxes.find(b => b.current_stage === 'inventory').box_sessions[0].status = 'completed'
      localStorage.setItem('ibooktrack_demo_state', JSON.stringify(state))
    })
    await page.goto(`${base}/inventory`)
    await page.getByRole('button', { name: /^Outgoing/ }).click()
    await page.getByRole('button', { name: 'Print Label', exact: true }).first().click()
    await page.waitForFunction(() => window.__printedBarcode === true)
    console.log('DEFERRED BARCODE PRINT OK')
    assert.deepEqual(errors,[])
    assert.deepEqual(remote,[])
    // Production Next.js links should warm the local routes before a click.
    if (process.env.CHECK_PREFETCH === '1') assert.ok(prefetched.has('/inventory'), 'Inventory should be prefetched')
    console.log('PASS: navigation links, deferred export, no remote requests')
  } finally { await browser.close() }
})().catch(e=>{console.error(e);process.exitCode=1})
