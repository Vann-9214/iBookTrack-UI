/**
 * Legacy MACHINE_ID_MAP
 * Originally used to map Scan Manager network hostnames to physical barcoded sticker IDs.
 * Retired on 2026-07-18 because Zeus natively returns the correct Machine Name.
 */
export const MACHINE_ID_MAP = {
  'INNO_129367-2':   'A-1081125000079',
  'INNO_129367-1':   'A-1081125000080',
  'IKSCEWKS0013885': 'CL8C100252',
  'IKSCEWKS0013874': 'CL8C100248',
  'IKSCEWKS0014879': 'CL8C100351',
  'IKSCEWKS0014899': 'CL8C100350',
  'IKSCEWKS0014898': 'CL8C100334',
  'IKSCEWKS0014880': 'CL8C100352',
  'IKSCEWKS0014878': 'CL8C100347',
  'IKSCEWKS0014900': 'CL8C100321',
  'IKSCEWKS0013873': 'CL8C100265',
  'IKSCEWKS0013876': 'CL8C100254',
  'IKSCEWKS0013877': 'CL8C100272',
  'IKSCEWKS0013888': 'CL8C100250',
  'IKSCEWKS0013887': 'CLBC100246',
  'IKSCEWKS0013886': 'CL8C100267',
  'IKSCEWKS0013882': 'CL8C100225',
  'IKSCEWKS0013891': 'CL8C100275',
  'IKSCESCN0013829': 'CL8C100276',
  'IKSCEWKS0013823': 'CL8C100229',
  'IKSCEWKS0013883': 'CL8C100255',
  'IKSCEWKS0013822': 'CL8C100249',
  'IKSCEWKS0013821': 'CL8C100251',
  'IKSCEWKS0013878': 'CL8C100245',
  'IKSCEWKS0013761': 'CL8C100253',
  'IKSCEWKS0013881': 'CL8C100235',
  'IKSCEWKS0013763': 'CL8C100239',
  'IKSCEWKS0013765': 'CL8C100320',
  'IKSCEWKS0013764': 'CL8C100247',
  'IKSCEWKS0013880': 'CL8C100234',
  'IKSCEWKS0013819': 'CL8C100256',
  'IKSCEWKS0013890': 'CL8C100274',
  'IKSCEWKS0013820': 'CL8C100266',
  'IKSCEWKS0013879': 'CL8C100237',
  'IKSCEWKS0013892': 'CL8C100257',
  'IKSCEWKS0013787': 'JF402987',
  'IKSCEWKS0013789': 'JF403054',
  'IKSCEWKS0013786': 'JF403053',
  'IKSCEWKS0013762': 'JF402992',
}

// ── Location-based machine filters (Historical) ──────────────────────────────
// Jaguar hostnames are those whose physical IDs start with JF4
export const JAGUAR_MACHINE_HOSTNAMES = Object.keys(MACHINE_ID_MAP).filter(
  h => MACHINE_ID_MAP[h].startsWith('JF4')
)
// Mustang hostnames = everything in the map that is NOT Jaguar
export const MUSTANG_MACHINE_HOSTNAMES = Object.keys(MACHINE_ID_MAP).filter(
  h => !MACHINE_ID_MAP[h].startsWith('JF4')
)

export const JAGUAR_SQL_LIST  = JAGUAR_MACHINE_HOSTNAMES.map(m => `'${m}'`).join(',')
export const MUSTANG_SQL_LIST = MUSTANG_MACHINE_HOSTNAMES.map(m => `'${m}'`).join(',')

/**
 * Historical machine filter function. Was used to generate SQL WHERE fragments.
 */
export function machineFilter(location = 'mustang') {
  if (location === 'jaguar') return `ScanMachineName IN (${JAGUAR_SQL_LIST})`
  return `ScanMachineName IN (${MUSTANG_SQL_LIST})`
}
