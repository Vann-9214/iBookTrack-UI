# iBookTrack — System Functionalities

> Prepared for management review. This document lists all functionalities currently implemented in the iBookTrack system.

---

## 1. What the System Does

iBookTrack is a Warehouse Management System (WMS) and Executive Dashboard built for Innodata's physical book digitization workflow. It replaces manual Excel-based tracking with real-time, database-backed tracking of every physical book as it moves through digitization.

---

## 2. The 8-Stage Book Pipeline

Every book/box is tracked sequentially through these stages, with a digital handshake required to move from one stage to the next (so nothing can be lost or skipped):

| # | Stage | Function |
|---|-------|----------|
| 1 | **Warehouse** | Books are received and scanned into the system; immediately checked for processability (damage, missing pages, etc.) |
| 2 | **Inventory** | Confirms official acceptance of the books into inventory |
| 3 | **Cut** | Books are sent to the cutting station to remove bindings |
| 4 | **Endorsement (QA)** | Full quality inspection — checked for missing pages, blurriness, physical damage |
| 5 | **Scan** | Books are handed off to the high-speed scanning machines |
| 6 | **Transmit** | Confirms the digital PDFs have successfully reached the final servers |
| 7 | **Storage** | Books are placed into their final physical storage bins |

---

## 3. Core Functionalities

### Authentication & User Management
- Secure login/logout with JWT-based sessions and automatic token refresh
- User registration and profile management
- Password change
- Role-based access control (e.g., Supervisor vs. operational staff roles) — restricts who can view data or perform actions
- Single sign-on integration with Innodata's internal system (iLMS)
- Rate-limiting on login/registration to prevent abuse

### Warehouse Receiving
- Start, resume, and complete scanning sessions per lot
- Barcode/QR scanning for fast book intake
- Automatic detection of duplicate/similar lots and lot-number mismatches against the iLMS catalog
- Bulk-save of scanned sessions
- Ability to flag books as damaged/non-processable at the point of intake, with a reason code
- Lock mechanism so only one user can work a box/session at a time (prevents double-entry); other users see it live as "locked"
- Live warehouse overview showing all active lots and their scan status

### Inventory & Box Tracking
- View and search all boxes by number, lot, or ID
- Advance a box to the next pipeline stage or send it forward
- Roll back a box to a previous stage if an error is discovered
- Receive boxes at each checkpoint (Inventory, Cut, Scan handshakes)
- Track pipeline transition history (audit trail of every stage change)
- Cross-check books against Simflex machine data for scanning verification
- Print box labels

### Lot Management
- View all lots and drill into details for a specific lot
- Transmission summary per lot (how many books transmitted vs. pending)

### Quality Control (QC) / Flagging
- Flag or unflag individual books during intake or QA with a specific issue reason (torn pages, bleed-through, missing pages, blurriness, etc.)
- Central "Missing Item Log" of all flagged/rejected books with reasons
- Resolve QC flags once addressed
- Export mismatched/flagged items for reporting
- Detect and warn about missing ISBNs in the catalog

### Scanning Floor Monitoring
- Live view of scanning activity by machine
- Per-machine book assignment and throughput ranking
- Export scan data
- Cross-reference against Simflex (the physical scanning machine system) for status validation
- Enrich scan records with iLMS metadata (titles, etc.)

### Storage / Warehouse Locator
- Provision and manage physical storage bin locations (Supervisor only)
- Assign/confirm/remove batches of books to storage locations
- Instantly search and locate any book or lot's physical storage bin
- View boxes ready for storage assignment and pending assignments

### Executive Dashboard
- Live stats: active lots, books currently in the pipeline, daily transmissions, flagged/rejected items
- Visual pipeline breakdown (how many books are at each of the 8 stages)
- Recent activity feed of live scans
- Global search (look up any book/lot instantly)
- Real-time notifications (via live event stream) when a station is locked, unlocked, or delayed — so staff know instantly if a session is stuck

### Reporting
- Real-time lot status reports
- Daily output reports
- Mismatch/QC export reports for offline review

---

## 4. Technology Summary (for IT reference)

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | Node.js, Express.js (REST API) |
| Database | PostgreSQL |
| Authentication | Custom JWT-based security |
| Real-time updates | Server-Sent Events (SSE) |
| External Integrations | Innodata iLMS (catalog/SSO), Simflex (scanning machines) |

---

*For full technical documentation (API routes, database schema, deployment steps), see the companion documents in `docs/`: `PROJECT_OVERVIEW.md`, `architecture/BACKEND.md`, `architecture/FRONTEND.md`, `guides/MIGRATION_GUIDE.md`.*
