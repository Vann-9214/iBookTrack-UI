/**
 * utils/lotUtils.js
 *
 * Helper functions for parsing and formatting lot numbers.
 */

/**
 * Generates an array of fuzzy search candidates for a given lot number string.
 * This is used to resolve user inputs like "Lot-64" or "64" to a standard set.
 * 
 * @param {string} lotNumber - The raw lot number string provided by the user/client.
 * @returns {string[]} An array of candidate strings for database search.
 */
export const generateLotCandidates = (lotNumber) => {
  const raw = lotNumber.trim();
  const num = raw.replace(/^lot[-\s]*/i, '').trim();
  return [raw, `Lot-${num}`, `LOT-${num}`, `Lot ${num}`, `lot-${num}`];
};
