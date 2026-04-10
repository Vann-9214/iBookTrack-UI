import sql from 'mssql'

// Simflex WMS Database Configuration
const config = {
  server: '10.250.0.227',
  port: 50982,
  database: 'JAGSP_WMS',
  user: 'oos',
  password: 'it-oos',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}

let pool = null

/**
 * Get or create database connection pool
 */
async function getPool() {
  if (!pool) {
    pool = await sql.connect(config)
  }
  return pool
}

/**
 * Get today's scanning statistics
 */
export async function getTodayScanningSummary() {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) as TotalScans,
        SUM(CASE WHEN Status = 'COMPLETED' THEN 1 ELSE 0 END) as Completed,
        SUM(CASE WHEN Status = 'FAILED' THEN 1 ELSE 0 END) as Failed,
        SUM(CASE WHEN Status = 'Ongoing' THEN 1 ELSE 0 END) as Ongoing
      FROM Scans
      WHERE CAST(ScanDate as DATE) = CAST(GETDATE() as DATE)
    `)
    
    return {
      success: true,
      data: result.recordset[0]
    }
  } catch (error) {
    console.error('Error fetching scanning summary:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get scanning data by date range
 */
export async function getScanningData(startDate, endDate) {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .input('startDate', sql.DateTime, startDate)
      .input('endDate', sql.DateTime, endDate)
      .query(`
        SELECT 
          ScanDate,
          ScanUser,
          BoxNumber,
          ISBN,
          PageCount,
          Status,
          Path,
          MachineName,
          Updated,
          ibmStatusText,
          isRework
        FROM Scans
        WHERE ScanDate BETWEEN @startDate AND @endDate
        ORDER BY Updated DESC
      `)
    
    return {
      success: true,
      data: result.recordset
    }
  } catch (error) {
    console.error('Error fetching scanning data:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get scanning stats by machine (printer)
 */
export async function getScanningByMachine() {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT 
        MachineName,
        COUNT(*) as TotalScans,
        SUM(CASE WHEN Status = 'COMPLETED' THEN 1 ELSE 0 END) as Completed,
        SUM(CASE WHEN Status = 'FAILED' THEN 1 ELSE 0 END) as Failed,
        MAX(Updated) as LastUpdate
      FROM Scans
      WHERE CAST(ScanDate as DATE) = CAST(GETDATE() as DATE)
      GROUP BY MachineName
      ORDER BY TotalScans DESC
    `)
    
    return {
      success: true,
      data: result.recordset
    }
  } catch (error) {
    console.error('Error fetching machine stats:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get scanning stats by stage (Scanning, Validate, PDF Conversion, etc.)
 */
export async function getScanningByStage() {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT 
        Stage,
        COUNT(*) as Total,
        SUM(CASE WHEN Status = 'COMPLETED' THEN 1 ELSE 0 END) as Completed,
        SUM(CASE WHEN Status = 'FAILED' THEN 1 ELSE 0 END) as Failed,
        SUM(CASE WHEN Status = 'Ongoing' THEN 1 ELSE 0 END) as Ongoing
      FROM Scans
      WHERE CAST(ScanDate as DATE) = CAST(GETDATE() as DATE)
      GROUP BY Stage
    `)
    
    return {
      success: true,
      data: result.recordset
    }
  } catch (error) {
    console.error('Error fetching stage stats:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Close database connection
 */
export async function closeConnection() {
  if (pool) {
    await pool.close()
    pool = null
  }
}

export default {
  getTodayScanningSummary,
  getScanningData,
  getScanningByMachine,
  getScanningByStage,
  closeConnection
}
