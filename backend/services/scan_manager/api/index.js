import * as reports from './reports.js'
import * as stages from './stages.js'
import * as status from './status.js'

export const {
  getDailyOutputCount,
  getDailyOutputRows,
  getTodayScanningSummary,
  getScanningData,
  getScanningByMachine,
  getBooksByMachine,
  getScanningByStage,
  getScanningRanking,
  getScanningExportData,
  getTotalScansAllTime
} = reports

export const {
  getScanStageBoxes,
  getTransmitStageRows,
  getCompletedTransmissionsCount,
  getAllBooksToday
} = stages

export const {
  getSimflexStatusForISBNs
} = status

export default {
  ...reports,
  ...stages,
  ...status,
}