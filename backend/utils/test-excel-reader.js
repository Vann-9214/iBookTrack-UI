import excelReader from '../services/scanning-excel-reader.js'

console.log('\n📊 Testing Excel File Reader...\n')
console.log('='.repeat(60) + '\n')

async function testExcelReader() {
  // Test 1: Read raw Excel data
  console.log('Test 1: Reading Excel file...')
  const rawData = await excelReader.readScanningExcel()
  
  if (rawData.success) {
    console.log('✅ Excel file read successfully!')
    console.log('Sheets found:', rawData.sheetNames)
    console.log('Last modified:', rawData.lastModified)
    console.log('\nFirst sheet data (first 3 rows):')
    const firstSheet = rawData.data[rawData.sheetNames[0]]
    console.log(JSON.stringify(firstSheet.slice(0, 3), null, 2))
  } else {
    console.log('❌ Failed to read Excel:', rawData.error)
    console.log('\n⚠️  Please update the EXCEL_FILE_PATH in:')
    console.log('   backend/services/scanning-excel-reader.js')
    console.log('\n   Current path: C:/Users/MUSTANG-OJT/Downloads/book_scanning_dashboard_Scan Manager/DashboardLatest.xlsx')
    return
  }
  
  console.log('\n' + '-'.repeat(60) + '\n')
  
  // Test 2: Get summary
  console.log('Test 2: Getting scanning summary...')
  const summary = await excelReader.getTodayScanningSummaryFromExcel()
  
  if (summary.success) {
    console.log('✅ Summary retrieved!')
    console.log(JSON.stringify(summary.data, null, 2))
  } else {
    console.log('❌ Failed:', summary.error)
  }
  
  console.log('\n' + '-'.repeat(60) + '\n')
  
  // Test 3: Get by machine
  console.log('Test 3: Getting stats by machine...')
  const byMachine = await excelReader.getScanningByMachineFromExcel()
  
  if (byMachine.success) {
    console.log('✅ Machine stats retrieved!')
    console.log(JSON.stringify(byMachine.data, null, 2))
  } else {
    console.log('❌ Failed:', byMachine.error)
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
}

testExcelReader().catch(console.error)
