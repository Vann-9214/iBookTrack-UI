import axios from 'axios'

const BASE = 'https://simflex.innodata.com/wms.services/WMS.Services.asmx/TechGetDatabaseDataset'
const KEY = '00001111'
const CONFIG = '045'

async function query(script) {
  const r = await axios.get(BASE, { params: { apiKey: KEY, config: CONFIG, script }, timeout: 10000 })
  return r.data
}

async function run() {
  // Find where today's scan data is - check the scanning tool table
  // The tool showed 4,485 books and scans happening today (2026-04-16)

  // Check BoxNumberScanner
  console.log('=== BoxNumberScanner recent ===')
  const bns = await query('SELECT TOP 3 * FROM BoxNumberScanner ORDER BY ID DESC')
  console.log(JSON.stringify(bns).substring(0, 400))

  // Check zeusz_logs_scanning with latest data
  console.log('\n=== zeusz_logs_scanning latest 3 ===')
  const scan = await query('SELECT TOP 3 * FROM zeusz_logs_scanning ORDER BY RefId DESC')
  console.log(JSON.stringify(scan).substring(0, 600))

  // Check zeusz_logs_transmit
  console.log('\n=== zeusz_logs_transmit latest ===')
  const trans = await query('SELECT TOP 3 * FROM zeusz_logs_transmit ORDER BY RefId DESC')
  console.log(JSON.stringify(trans).substring(0, 600))

  // Check wms_Jobs for active jobs today
  console.log('\n=== wms_Jobs today ===')
  const jobs = await query('SELECT TOP 3 * FROM wms_Jobs ORDER BY JobId DESC')
  console.log(JSON.stringify(jobs).substring(0, 600))

  // Check ISBNBoxNumberScanner latest regardless of date
  console.log('\n=== ISBNBoxNumberScanner latest 3 ===')
  const isbn = await query('SELECT TOP 3 * FROM ISBNBoxNumberScanner ORDER BY ID DESC')
  console.log(JSON.stringify(isbn).substring(0, 600))
}

run().catch(console.error)
