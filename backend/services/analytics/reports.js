/**
 * services/analytics/reports.js
 *
 * Business logic for report generation.
 */

import * as reportsRepo from '../../repositories/analytics/reports.js';

export const getLotStatusService = async (req, res) => {
  const { type } = req.query;

  // Normalize brand/type to match database storage (e.g. mustang -> Mustang)
  const brandType = type
    ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
    : null;

  const lots = await reportsRepo.getLots(brandType);
  const boxes = await reportsRepo.getAllBoxesWithSessions();
  const scans = await reportsRepo.getAllScans();

  // Index boxes by id and group by lot
  const boxById = {};
  const boxesByLot = {};
  for (const box of boxes) {
    boxById[box.id] = box;
    if (!boxesByLot[box.lot_id]) boxesByLot[box.lot_id] = [];
    boxesByLot[box.lot_id].push(box);
  }

  // Group scans by lot via box
  const scansByLot = {};
  for (const scan of scans) {
    const boxId = scan.books?.box_id;
    const box = boxById[boxId];
    if (!box) continue;
    const lotId = box.lot_id;
    if (!scansByLot[lotId]) scansByLot[lotId] = [];
    scansByLot[lotId].push({ ...scan, boxStage: box.current_stage });
  }

  const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit'];

  const result = lots.map(lot => {
    const lotBoxes = boxesByLot[lot.id] || [];
    const lotScans = scansByLot[lot.id] || [];

    const totalBoxes = lotBoxes.length;
    const totalScans = lotScans.length;
    const processableScans = lotScans.filter(s => s.scan_status === 'processable');
    const nonProcessableScans = lotScans.filter(s => s.scan_status !== 'processable');

    // "Transmitted" = processable book whose box reached storage OR explicitly complete/received/sent
    const transmittedScans = processableScans.filter(s => s.boxStage === 'storage' || (s.transmission_status && /COMPLETE|RECEIVED|SENT/i.test(s.transmission_status)));
    // "Pending" = processable book still in pipeline and not explicitly complete/received/sent
    const pendingScans = processableScans.filter(s => s.boxStage !== 'storage' && !(s.transmission_status && /COMPLETE|RECEIVED|SENT/i.test(s.transmission_status)));

    const boxList = lotBoxes.map(b => {
      // Scans specifically for this box
      const bScans = lotScans.filter(s => s.books?.box_id === b.id);
      const proc = bScans.filter(s => s.scan_status === 'processable');
      const trans = proc.filter(s => 
        (s.transmission_status && /COMPLETE|RECEIVED|SENT/i.test(s.transmission_status)) || 
        b.current_stage === 'storage'
      );
      
      // 1. Box Journey Base Progress (0% to 50%)
      let baseProgress = 0;
      const stage = b.current_stage || '';
      const sessionStatus = b.box_sessions && b.box_sessions.length > 0 ? b.box_sessions[0].status : 'received';

      if (stage === 'warehouse') {
        baseProgress = 10;
      } else if (stage === 'inventory') {
        baseProgress = sessionStatus === 'received' ? 15 : (sessionStatus === 'completed' ? 20 : 25);
      } else if (stage === 'cut') {
        baseProgress = sessionStatus === 'received' ? 30 : (sessionStatus === 'completed' ? 35 : 40);
      } else if (stage === 'endorsement') {
        baseProgress = sessionStatus === 'received' ? 43 : (sessionStatus === 'completed' ? 46 : 48);
      } else if (stage === 'scan' || stage === 'transmit' || stage === 'storage') {
        baseProgress = 50;
      }

      // 2. Individual Book Progress (50% to 100%)
      let bookAverage = 0;
      let totalBookScore = 0;
      let pending_books = 0;
      let wip_books = 0;
      let transmitted_books = 0;

      if (proc.length > 0) {
        for (const scan of proc) {
          const status = (scan.transmission_status || '').toUpperCase();
          let score = 0;
          if (status.includes('SCANNING ONGOING')) score = 10;
          else if (status.includes('SCANNING COMPLETED')) score = 20;
          else if (status.includes('VALIDATE ONGOING')) score = 30;
          else if (status.includes('VALIDATE COMPLETED')) score = 40;
          else if (status.includes('TIF2PDF ONGOING') || status.includes('PDF CONVERSION ONGOING')) score = 50;
          else if (status.includes('TIF2PDF COMPLETED') || status.includes('PDF CONVERSION COMPLETED')) score = 60;
          else if (status.includes('PREVAL ONGOING')) score = 70;
          else if (status.includes('PREVAL COMPLETED')) score = 80;
          else if (status.includes('ARCHIVE ONGOING') || status.includes('TRANSMIT ONGOING') || status.includes('TRANSMISSION_ARCHIVE ONGOING')) score = 90;
          else if (status.includes('COMPLETE') || status.includes('RECEIVED') || status.includes('SENT') || stage === 'storage') score = 100;
          
          totalBookScore += score;
          
          if (score === 100) transmitted_books++;
          else if (score > 0) wip_books++;
          else pending_books++;
        }
        if (baseProgress === 50) {
          bookAverage = totalBookScore / proc.length;
        }
      } else if (stage === 'storage') {
        bookAverage = 100;
      }

      let progress = Math.round(baseProgress + (bookAverage / 2));

      const session = b.box_sessions && b.box_sessions.length > 0 ? b.box_sessions[0] : null;
      let time_in_stage = null;
      let turnaround_time = null;
      let is_stalled = false;

      if (session) {
        const stageTime = session[`${stage}_time_received`] || session.updated_at;
        if (stageTime) {
          const hours = (new Date() - new Date(stageTime)) / (1000 * 60 * 60);
          time_in_stage = hours;
          if (hours > 24 && stage !== 'storage' && stage !== 'transmit') {
            if (stage === 'scan') {
              // In Scan, only flag as stalled if all books are completely transmitted but it hasn't moved to storage
              if (proc.length > 0 && transmitted_books === proc.length) {
                is_stalled = true;
              }
            } else {
              is_stalled = true;
            }
          }
        }
        
        const start = session.warehouse_time_received;
        const end = session.scan_time_received;
        if (start && end) {
          turnaround_time = (new Date(end) - new Date(start)) / (1000 * 60 * 60);
        }
      }

      return {
        box_id: b.id,
        box_number: b.box_number,
        current_stage: progress === 100 ? 'storage' : (b.current_stage || 'Unknown'),
        progress,
        total_books: bScans.length,
        total_expected_books: b.total_expected_books || 0,
        processable: proc.length,
        non_processable: bScans.length - proc.length,
        pending_books,
        wip_books,
        transmitted_books,
        time_in_stage,
        turnaround_time,
        is_stalled
      };
    }).sort((a, b) => a.box_number.localeCompare(b.box_number, undefined, { numeric: true }));

    // Now calculate active and stored boxes based on the dynamically updated box list
    const activeBoxes = boxList.filter(b => PIPELINE_STAGES.includes(b.current_stage));
    const storedBoxes = boxList.filter(b => b.current_stage === 'storage');

    // Determine computed status based on strict rules:
    // In-Progress: One or more boxes are actively moving through the pipeline.
    // Closed: No active boxes, all boxes stored, no unaccounted processable books.
    // Open: No active boxes, but some boxes or books remain unaccounted for (or lot is empty).
    let computedStatus;
    if (activeBoxes.length > 0) {
      computedStatus = 'in-progress';
    } else {
      if (totalBoxes === 0 || storedBoxes.length !== totalBoxes || pendingScans.length > 0) {
        computedStatus = 'open';
      } else {
        computedStatus = 'closed';
      }
    }

    const simflex_breakdown = {};
    for (const scan of processableScans) {
      const status = (scan.transmission_status || '').toUpperCase();
      let label = 'Pending';
      if (status.includes('SCANNING')) label = 'Scanning';
      else if (status.includes('VALIDATE')) label = 'Validate';
      else if (status.includes('TIF2PDF') || status.includes('PDF CONVERSION')) label = 'PDF Conversion';
      else if (status.includes('PREVAL')) label = 'Preval';
      else if (status.includes('ARCHIVE') || status.includes('TRANSMIT') || status.includes('COMPLETE') || status.includes('RECEIVED') || status.includes('SENT')) label = 'Transmit';
      
      simflex_breakdown[label] = (simflex_breakdown[label] || 0) + 1;
    }

    return {
      lot_id: lot.id,
      lot_number: lot.lot_number,
      lot_status: lot.type ? lot.type.charAt(0).toUpperCase() + lot.type.slice(1) : null,
      computed_status: computedStatus,
      created_at: lot.created_at,
      total_boxes: totalBoxes,
      active_boxes: activeBoxes.length,
      stored_boxes: storedBoxes.length,
      total_scans: totalScans,
      transmitted: transmittedScans.length,
      non_processable: nonProcessableScans.length,
      pending: pendingScans.length,
      is_stalled: boxList.some(b => b.is_stalled),
      simflex_breakdown,
      boxes: boxList,
    };
  });

  return { success: true, lots: result };
};
