/**
 * utils/transmissionStatus.js
 *
 * Scan Manager (Simflex) status strings follow the format "<Stage> <KEYWORD>",
 * e.g. "Preval COMPLETED", "Validate COMPLETED", "Tif2PDF COMPLETED",
 * "Transmission_Archive COMPLETED". Every pipeline stage can report its own
 * "COMPLETED" state when that stage finishes — that does NOT mean the book
 * has been fully transmitted. Only "Transmission_Archive COMPLETED" (the
 * final stage) means the book is actually done.
 *
 * Never match on the word "completed" alone — always confirm the stage is
 * Transmission_Archive as well.
 */
export function isTransmissionArchiveCompleted(status) {
  if (!status) return false;
  const s = String(status).toUpperCase();
  return s.includes('TRANSMISSION') && s.includes('COMPLETED');
}
