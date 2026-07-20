/**
 * services/storage.js
 *
 * Business logic for physical storage locator system.
 */

import { logger } from '../utils/logger.js';
import * as storageRepo from '../repositories/storage.js';

export const getLocationsService = async () => {
  const { data: locations, error } = await storageRepo.getStorageLocationsWithAssignments();
  if (error) throw error;

  const normalized = locations.map(loc => ({
    id: loc.id,
    shelf: loc.shelf,
    rack: loc.rack,
    level: loc.level,
    capacity: loc.capacity,
    used: (loc.assignments || []).filter(a => (a.status || 'confirmed') === 'confirmed').length,
    assignments: (loc.assignments || []).map(a => ({
      assignment_id: a.id,
      status: a.status || 'confirmed',
      assigned_at: a.assigned_at,
      assigned_by_name: a.assigned_by_name,
      box_id: a.box?.id,
      box_number: a.box?.box_number,
      lot_number: a.box?.lot?.lot_number || null,
      total_books: a.box?.total_expected_books || 0,
      books: (a.box?.books || [])
        .flatMap(b => {
          const processable = (b.scans || []).some(s => s.scan_status === 'processable');
          return processable ? [{ isbn: b.isbn, title: b.title || `ISBN: ${b.isbn}` }] : [];
        }),
    })),
  }));

  return { success: true, locations: normalized };
};

export const provisionLocationsService = async (req) => {
  const { section, capacity = 38 } = req.body;
  const sec = Number(section);
  const racks = req.body.racks || ['A', 'B', 'C', 'D'];
  const levels = req.body.levels || [1, 2, 3, 4];

  const rows = racks.flatMap(rack =>
    levels.map(level => ({
      shelf: sec,
      rack: rack,
      level: Number(level),
      capacity: Number(capacity),
    }))
  );

  const { error: upsertError } = await storageRepo.upsertStorageLocations(rows);
  if (upsertError) throw upsertError;

  const { data, error: fetchError } = await storageRepo.getStorageLocationsWithAssignments();
  if (fetchError) throw fetchError;

  const normalized = (data || []).map(loc => ({
    id: loc.id,
    shelf: loc.shelf,
    rack: loc.rack,
    level: loc.level,
    capacity: loc.capacity,
    used: 0,
    assignments: [],
  }));

  return { success: true, locations: normalized };
};

export const updateLocationCapacityService = async (req) => {
  const { id } = req.params;
  const { capacity } = req.body;

  if (capacity == null || Number(capacity) < 1) {
    throw { status: 400, message: 'capacity must be at least 1' };
  }

  const { data: loc, error: locError } = await storageRepo.getStorageLocationById(id);
  if (locError || !loc) throw { status: 404, message: 'Location not found' };

  const usedCount = (loc.assignments || []).length;
  if (Number(capacity) < usedCount) {
    throw { status: 400, message: `Cannot set capacity below current usage (${usedCount} boxes assigned)` };
  }

  const { data, error } = await storageRepo.updateStorageLocationCapacity(id, Number(capacity));
  if (error) throw error;

  return { success: true, location: data };
};

export const deleteLocationService = async (req) => {
  const { error } = await storageRepo.deleteStorageLocation(req.params.id);
  if (error) throw error;
  return { success: true };
};

export const getReadyBoxesService = async (req) => {
  const { box_type } = req.query;

  const { data: assigned, error: assignedError } = await storageRepo.getAssignedBoxIds();
  if (assignedError) throw assignedError;

  const assignedIds = (assigned || []).map(a => a.box_id);

  const { data: boxes, error: boxesError } = await storageRepo.getScanStageBoxes(box_type, assignedIds);
  if (boxesError) throw boxesError;

  const readyBoxes = (boxes || []).filter(b => {
    const processableBooks = (b.books || []).filter(bk => 
      (bk.scans || []).some(s => s.scan_status === 'processable')
    );
    
    if (processableBooks.length === 0) return true;

    return processableBooks.every(bk => {
      return (bk.scans || []).some(s => {
        if (s.scan_status !== 'processable') return false;
        const ts = s.transmission_status ? s.transmission_status.toLowerCase() : '';
        return ts.includes('transmission') && ts.includes('completed');
      });
    });
  });

  const normalized = readyBoxes.map(b => ({
    id: b.id,
    box_number: b.box_number,
    lot_number: b.lot?.lot_number || null,
    total_books: b.total_expected_books || 0,
    books: (b.books || [])
      .flatMap(bk => {
        const processable = (bk.scans || []).some(s => s.scan_status === 'processable');
        return processable ? [{ isbn: bk.isbn, title: bk.title || `ISBN: ${bk.isbn}` }] : [];
      }),
  }));

  return { success: true, boxes: normalized };
};

export const assignBatchService = async (req) => {
  const { box_ids, storage_location_id } = req.body;

  const { data: existing, error: countError } = await storageRepo.getStorageAssignmentsByLocationId(storage_location_id);
  if (countError) throw countError;

  const { data: location, error: locError } = await storageRepo.getStorageLocationById(storage_location_id);
  if (locError || !location) throw { status: 404, message: 'Storage location not found' };

  const currentCount = (existing || []).length;
  if (currentCount + box_ids.length > location.capacity) {
    throw { status: 400, message: `Shelf ${location.shelf} Rack ${location.rack} Level ${location.level} can only hold ${location.capacity} boxes. ${currentCount} already assigned, ${box_ids.length} selected.` };
  }

  const { data: alreadyAssigned, error: alreadyError } = await storageRepo.getStorageAssignmentsByBoxIds(box_ids);
  if (alreadyError) throw alreadyError;

  if ((alreadyAssigned || []).length > 0) {
    const ids = alreadyAssigned.map(a => a.box_id).join(', ');
    throw { status: 400, message: `Some boxes are already assigned: ${ids}` };
  }

  const { data: boxes, error: boxesError } = await storageRepo.getBoxesByIds(box_ids);
  if (boxesError) throw boxesError;

  const nonScanBoxes = (boxes || []).filter(box => box.current_stage !== 'scan');
  if ((boxes || []).length !== box_ids.length || nonScanBoxes.length > 0) {
    const labels = nonScanBoxes.map(box => box.box_number || box.id).join(', ');
    throw { status: 400, message: `Only boxes in the scan stage can be assigned to storage${labels ? `: ${labels}` : ''}` };
  }

  const assignmentsToInsert = box_ids.map(box_id => ({
    storage_location_id,
    box_id,
    status: 'pending',
    assigned_by: req.user.id,
    assigned_by_name: req.user.user_metadata?.full_name || req.user.email,
  }));

  const { data: assignments, error: insertError } = await storageRepo.insertStorageAssignments(assignmentsToInsert);
  if (insertError) throw insertError;

  return { success: true, assignments: assignments || [] };
};

export const removeBatchService = async (req) => {
  const { assignment_ids } = req.body;

  const { data: removedAssignments, error: deleteError } = await storageRepo.deleteStorageAssignments(assignment_ids);
  if (deleteError) throw deleteError;

  const boxIds = [...new Set((removedAssignments || []).map(a => a.box_id))];
  if (boxIds.length > 0) {
    const { error: stageError } = await storageRepo.updateBoxesStage(boxIds, 'scan');
    if (stageError) throw stageError;
  }

  return { success: true, message: `${removedAssignments?.length || 0} box(es) removed from storage locations` };
};

export const searchStorageService = async (req) => {
  const { q, box_type, search_type } = req.query;
  const query = String(q).trim();

  let boxByNumber = [];
  if (search_type === 'box') {
    const { data } = await storageRepo.searchBoxesByNumber(query, box_type);
    boxByNumber = data || [];
  }

  let scansByIsbn = [];
  if (search_type === 'isbn') {
    const { data } = await storageRepo.searchBookActivityByIsbn(query);
    scansByIsbn = data || [];
  }

  let lotsByNumber = [];
  if (search_type === 'lot') {
    const { data } = await storageRepo.searchLotsByNumber(query);
    lotsByNumber = data || [];
  }

  let boxesByLot = [];
  let lotBoxCount = 0;
  if (lotsByNumber?.length) {
    const { data, count } = await storageRepo.searchBoxesByLotIds(lotsByNumber.map(lot => lot.id), box_type);
    boxesByLot = data || [];
    lotBoxCount = count || 0;
  }

  const lotSummary = lotsByNumber?.length
    ? { lot_numbers: lotsByNumber.map(lot => lot.lot_number), box_count: lotBoxCount }
    : null;

  const matchedBoxes = [...(boxByNumber || []), ...boxesByLot];
  const boxIds = new Set([
    ...matchedBoxes.map(b => b.id),
    ...(scansByIsbn || []).map(s => s.book?.box_id).filter(Boolean),
  ]);

  if (boxIds.size === 0) {
    return { success: true, results: [], lot_summary: lotSummary, message: 'No boxes found matching the search' };
  }

  const { data: assignments, error } = await storageRepo.getStorageAssignmentsForSearch(boxIds);
  if (error) throw error;

  const results = (assignments || []).map(a => ({
    assignment_id: a.id,
    status: a.status || 'confirmed',
    box_id: a.box?.id,
    box_number: a.box?.box_number,
    lot_number: a.box?.lot?.lot_number || null,
    rack: a.location?.rack,
    level: a.location?.level,
    location_id: a.location?.id,
    location_label: `Shelf ${a.location?.shelf} - Rack ${a.location?.rack} - Level ${a.location?.level}`,
  }));

  const assignedBoxIds = new Set(results.map(r => r.box_id));
  const unlocated = Array.from(boxIds).filter(id => !assignedBoxIds.has(id)).map(id => {
    const box = matchedBoxes.find(b => b.id === id);
    return { box_id: id, box_number: box?.box_number || id, located: false };
  });

  return { success: true, results, unlocated, lot_summary: lotSummary };
};

export const getPendingAssignmentsService = async (req) => {
  const { data, error } = await storageRepo.getPendingStorageAssignments(req.query.box_type);
  if (error) throw error;

  const assignments = (data || []).map(a => ({
    assignment_id: a.id,
    status: a.status,
    assigned_at: a.assigned_at,
    assigned_by_name: a.assigned_by_name,
    box_id: a.box?.id,
    box_number: a.box?.box_number,
    lot_number: a.box?.lot?.lot_number || null,
    total_books: a.box?.total_expected_books || 0,
    location_id: a.location?.id,
    rack: a.location?.rack,
    level: a.location?.level,
    location_label: `Shelf ${a.location?.shelf} - Rack ${a.location?.rack} - Level ${a.location?.level}`,
  }));

  return { success: true, assignments };
};

export const confirmAssignmentService = async (req) => {
  const { id } = req.params;
  const { data: assignment, error } = await storageRepo.updateStorageAssignmentStatus(id, 'confirmed');

  if (error) throw error;
  if (!assignment) throw { status: 404, message: 'Assignment not found' };

  if (assignment.box_id) {
    const { error: boxUpdateError } = await storageRepo.updateBoxesStage([assignment.box_id], 'storage');
    if (boxUpdateError) logger.error('Failed to update box current_stage on confirm:', boxUpdateError);
  }

  return { success: true, assignment: { id: assignment.id, status: assignment.status } };
};


