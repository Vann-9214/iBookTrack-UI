import { getTodayScanningSummary, getScanningByMachine, getScanningByStage } from '../services/simflex-db.js'

async function run() {
  console.log('=== Testing simflex-db.js service ===\n')

  console.log('1. getTodayScanningSummary:')
  const summary = await getTodayScanningSummary()
  console.log(JSON.stringify(summary, null, 2))

  console.log('\n2. getScanningByMachine:')
  const machines = await getScanningByMachine()
  console.log(JSON.stringify(machines, null, 2).substring(0, 600))

  console.log('\n3. getScanningByStage:')
  const stages = await getScanningByStage()
  console.log(JSON.stringify(stages, null, 2))
}

run().catch(console.error)
