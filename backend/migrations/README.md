# iBookTrack Database Migrations

This directory contains SQL migration files for the iBookTrack Supabase database.

## Migration Overview

### User Management (001-003)
- **001_create_profiles_table.sql** - User profiles linked to auth.users
- **002_rls_policies.sql** - Row Level Security for profiles
- **003_auto_create_profile_trigger.sql** - Auto-create profile on signup

### Core Data Structure (004-006)
- **004_create_lots_and_shipments.sql** - Shipments and Lots (containers)
- **005_create_boxes_table.sql** - Boxes within lots (unique IDs, contains books)
- **006_create_books_table.sql** - Individual books with ISBN/barcode

### Tracking & Logging (007-010)
- **007_create_unaccounted_books_log.sql** - Missing/unaccounted books tracking
- **008_create_transmission_queue.sql** - Transmission progress tracking
- **009_create_pipeline_tracking.sql** - 8-step pipeline stage tracking
- **010_create_scan_history.sql** - Inventory gate scan logs

### Security (011)
- **011_create_rls_policies_for_new_tables.sql** - RLS policies for all tables

## Database Schema Summary

### Hierarchy
```
Shipment (SHIP-2025-001)
  └── Lot (LOT-2024-0891) [1-2 containers]
       └── Box (BOX-001) [hundreds per lot]
            └── Book (ISBN) [multiple per box]
```

### Key Tables

**shipments**
- Tracks shipping batches
- Fields: shipment_code, status, description

**lots**
- Represents 1-2 containers
- Fields: lot_number, shipment_id, total_boxes, status

**boxes**
- Unique boxes within lots
- Fields: box_number, lot_id, total_expected_books, books_received, total_transmitted_books, current_stage

**books**
- Individual book records
- Fields: isbn, barcode, box_id, title, project_name, book_type (Mustang/Jaguar)
- Will be populated from client's API when available
- Supports manual entry and ISBN scanning

**unaccounted_books**
- Logs missing/unaccounted books
- Fields: isbn, lot_number, stage_detected, reported_by, resolved

**transmission_queue**
- Tracks transmission progress
- Fields: lot_id, box_id, books_received, total_transmitted_books, status

**pipeline_events**
- Audit trail for box movement through pipeline
- Fields: box_id, from_stage, to_stage, moved_by

**scan_history**
- Inventory gate scan logs
- Fields: isbn, barcode, scanned_by, slip_printed

### Pipeline Stages
1. Intake
2. Cut
3. Book Inspection & Endorsement
4. Scan
5. Validation
6. QA
7. Transmit
8. Storage

## Running Migrations

### Option 1: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste each migration file in order (001, 002, 003, etc.)
3. Run each migration

### Option 2: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### Option 3: Manual SQL Execution
```bash
# Using psql
psql -h YOUR_DB_HOST -U postgres -d postgres -f migrations/001_create_profiles_table.sql
```

## Notes for Client API Integration

When the client provides their book database API:

1. **Books Table** - Update the `books` table insert/update logic in backend routes
2. **API Endpoint** - Create a new route in `backend/routes/books.js` to fetch from client API
3. **ISBN Barcode API** - If client provides ISBN-to-barcode API, integrate in scan functionality
4. **Data Sync** - Consider creating a sync job to periodically fetch book updates

The current schema is designed to be flexible and can accommodate external API data without major changes.

## User Roles

- **user** - Basic read access
- **warehouse_staff** - Can modify boxes, books, and track pipeline events
- **admin** - Full access to all tables

## Important Indexes

All tables have appropriate indexes for:
- Foreign key relationships
- Status fields
- Timestamp fields (for sorting/filtering)
- ISBN/barcode lookups

## Auto-Update Triggers

All tables with `updated_at` fields have triggers that automatically update the timestamp on row changes.
