/**
 * Build polished PDFs from the iBookTrack handover docs.
 *
 *   cd docs
 *   npm install
 *   npm run build:pdf
 *
 * Output: docs/pdf/*.pdf
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'
import puppeteer from 'puppeteer'
import { Marked } from 'marked'
import markedAlert from 'marked-alert'
import { gfmHeadingId } from 'marked-gfm-heading-id'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DOCS = [
  { file: '../docs/PROJECT_OVERVIEW.md', title: 'iBookTrack — Project Overview' },
  { file: '../docs/architecture/BACKEND.md',          title: 'iBookTrack — Backend Documentation' },
  { file: '../docs/architecture/FRONTEND.md',         title: 'iBookTrack — Frontend Documentation' },
  { file: '../docs/guides/MIGRATION_GUIDE.md',  title: 'iBookTrack — Migration & Turnover Guide' },
]

const marked = new Marked()
marked.use(markedAlert(), gfmHeadingId())

// Wrap fenced ```mermaid blocks in <pre class="mermaid"> so the browser plugin renders them.
const mermaidRenderer = {
  code({ text, lang }) {
    if (lang === 'mermaid') {
      return `<pre class="mermaid">${text}</pre>`
    }
    return false // fall back to default renderer
  },
}
marked.use({ renderer: mermaidRenderer })

const CSS = `
  @page {
    size: A4;
    margin: 18mm 16mm 20mm 16mm;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1f2328;
    margin: 0;
  }
  .cover {
    page-break-after: always;
    height: 257mm;            /* roughly A4 minus margins */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 30mm 10mm;
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #38bdf8 100%);
    color: white;
    border-radius: 4px;
  }
  .cover .eyebrow { font-size: 11pt; letter-spacing: .25em; text-transform: uppercase; opacity: .85; margin-bottom: 14mm; }
  .cover h1 { font-size: 32pt; line-height: 1.1; margin: 0 0 8mm 0; font-weight: 800; }
  .cover .subtitle { font-size: 13pt; max-width: 150mm; opacity: .92; }
  .cover .meta { margin-top: auto; font-size: 9pt; opacity: .8; }

  h1, h2, h3, h4 {
    color: #0f172a;
    line-height: 1.25;
    margin-top: 1.6em;
    margin-bottom: .55em;
  }
  h1 { font-size: 22pt; padding-bottom: .3em; border-bottom: 2px solid #e2e8f0; }
  h2 { font-size: 16pt; padding-bottom: .25em; border-bottom: 1px solid #e2e8f0; }
  h3 { font-size: 13pt; }
  h4 { font-size: 11pt; color: #334155; }

  p, ul, ol { margin: .55em 0; }
  ul, ol { padding-left: 1.4em; }
  li + li { margin-top: .15em; }

  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }

  code {
    font-family: "SF Mono", "JetBrains Mono", Consolas, "Liberation Mono", monospace;
    font-size: .9em;
    background: #f1f5f9;
    padding: 1.5px 5px;
    border-radius: 4px;
  }
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 12px 14px;
    border-radius: 6px;
    font-size: 8.8pt;
    line-height: 1.45;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  pre code { background: transparent; padding: 0; color: inherit; font-size: inherit; }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: .9em 0;
    font-size: 9.6pt;
    page-break-inside: avoid;
  }
  th, td { border: 1px solid #e2e8f0; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 600; color: #0f172a; }
  tr:nth-child(even) td { background: #fafbfc; }

  blockquote {
    margin: .8em 0;
    padding: 4px 14px;
    border-left: 4px solid #cbd5e1;
    color: #475569;
    background: #f8fafc;
    border-radius: 0 4px 4px 0;
  }

  /* GitHub-style alert callouts (provided by marked-alert) */
  .markdown-alert {
    padding: 10px 14px;
    margin: 1em 0;
    border-left: 4px solid;
    border-radius: 0 6px 6px 0;
    page-break-inside: avoid;
  }
  .markdown-alert-title {
    display: flex; align-items: center; gap: 6px;
    font-weight: 700;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: .04em;
    font-size: 9.5pt;
  }
  .markdown-alert-note      { background: #ddebf6; border-color: #0969da; color: #033a73; }
  .markdown-alert-note .markdown-alert-title { color: #0969da; }
  .markdown-alert-tip       { background: #ddf3e2; border-color: #1a7f37; color: #0f4d23; }
  .markdown-alert-tip .markdown-alert-title { color: #1a7f37; }
  .markdown-alert-important { background: #ece4ff; border-color: #7c3aed; color: #3b0d8c; }
  .markdown-alert-important .markdown-alert-title { color: #7c3aed; }
  .markdown-alert-warning   { background: #fff4d6; border-color: #b08800; color: #6e4f00; }
  .markdown-alert-warning .markdown-alert-title { color: #b08800; }
  .markdown-alert-caution   { background: #ffe2e2; border-color: #cf222e; color: #82071e; }
  .markdown-alert-caution .markdown-alert-title { color: #cf222e; }

  /* Mermaid diagrams render as SVG inside .mermaid */
  .mermaid {
    background: white;
    text-align: center;
    padding: 8px 0;
    margin: 1em 0;
    page-break-inside: avoid;
  }
  /* shields.io badges — keep them inline */
  img[src*="img.shields.io"] {
    display: inline-block;
    margin: 0 4px 4px 0;
    vertical-align: middle;
    max-height: 18px;
  }

  hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1.6em 0; }

  /* Print niceties */
  h1, h2, h3 { page-break-after: avoid; }
  table, pre, .mermaid, blockquote, .markdown-alert { page-break-inside: avoid; }
`

function renderHTML({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
  <section class="cover">
    <div class="eyebrow">iBookTrack · Handover Documentation</div>
    <h1>${title.replace('iBookTrack — ', '')}</h1>
    <div class="subtitle">A unified Warehouse Management System and Executive Dashboard for Innodata's book-digitization pipeline.</div>
    <div class="meta">Generated ${new Date().toISOString().slice(0, 10)} · Ivan, Divan, John &amp; Francis</div>
  </section>

  <main>${body}</main>

  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
    await mermaid.run({ querySelector: '.mermaid' })
    window.__mermaidDone = true
  </script>
</body>
</html>`
}

async function buildOne(browser, doc, outDir) {
  const mdPath = join(__dirname, doc.file)
  const md = await readFile(mdPath, 'utf-8')
  const body = await marked.parse(md)
  const html = renderHTML({ title: doc.title, body })

  // HTML generation complete, proceeding to PDF creation.

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: ['load', 'networkidle0'] })

  // Wait until Mermaid finishes rendering (or 5s safety timeout).
  await page.waitForFunction('window.__mermaidDone === true', { timeout: 8000 }).catch(() => {})

  const pdfPath = join(outDir, basename(doc.file, '.md') + '.pdf')
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:8px;color:#94a3b8;width:100%;padding:0 14mm;display:flex;justify-content:space-between;">
        <span>${doc.title}</span><span>iBookTrack Handover</span>
      </div>`,
    footerTemplate: `<div style="font-size:8px;color:#94a3b8;width:100%;padding:0 14mm;text-align:right;">
        Page <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`,
  })

  await page.close()
  console.log(`✓ ${doc.file}  →  ${pdfPath}`)
}

async function main() {
  const outDir = join(__dirname, '../docs/pdf')
  await mkdir(outDir, { recursive: true })

  console.log('Launching headless Chromium…')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    for (const doc of DOCS) {
      await buildOne(browser, doc, outDir)
    }
  } finally {
    await browser.close()
  }

  console.log(`\nDone. ${DOCS.length} PDFs written to ${outDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
