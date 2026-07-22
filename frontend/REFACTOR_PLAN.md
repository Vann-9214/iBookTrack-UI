# Frontend Cleanup & Refactor Plan

> Generated from codebase inspection on 2026-07-20.
> Scope: `frontend/` directory of the iBookTrack Next.js App Router project.

---

## 0. Executive Summary

The frontend is a Next.js 15 + React 19 + Tailwind 4 + shadcn/ui application. It currently uses a **flat root-level structure** (`app/`, `components/`, `hooks/`, `lib/`). The code works, but several maintainability issues have accumulated:

- **Massive pages** with business logic, API calls, and UI mixed together.
- **Duplicated constants/utilities** across pages (flag issues, stage metadata, user formatting, time formatting).
- **Scattered API calls** in 20+ files instead of a service layer.
- **Dead and duplicate code** (custom components, unused shadcn/ui primitives, duplicate hooks).
- **No feature-based organization**; components are grouped by type, not by domain.

This plan proposes reorganizing into a **feature-based structure** (with or without a `src/` wrapper), extracting business logic into hooks/services, centralizing shared constants, and removing dead code incrementally.

---

## 1. Current State

### 1.1 Folder Structure Today

```text
frontend/
├── app/                       # Next.js App Router pages
│   ├── Dashboard/
│   ├── checkpoints/
│   ├── cut/
│   ├── forgot-password/
│   ├── intake/
│   ├── inventory/
│   ├── landing-page/
│   ├── locator/
│   ├── login/
│   ├── notifications/
│   ├── qa/
│   ├── register/
│   ├── reports/
│   ├── scan-qr/
│   ├── scan/
│   ├── settings/
│   ├── transmission/
│   ├── warehouse/
│   └── box/[boxNumber]/      # empty route - dead
├── components/                # flat component dump
│   ├── ui/                    # shadcn/ui primitives
│   └── *.tsx                  # custom components
├── hooks/                     # global hooks
├── lib/                       # utilities + auth API wrapper
├── styles/
└── public/
```

### 1.2 Page Size Audit

| Page | Lines | Category |
|------|-------|----------|
| `app/inventory/page.tsx` | 2,478 | Very Large |
| `app/checkpoints/page.tsx` | 2,158 | Very Large |
| `app/transmission/page.tsx` | 1,938 | Very Large |
| `app/locator/page.tsx` | 1,743 | Very Large |
| `app/warehouse/page.tsx` | 1,647 | Very Large |
| `app/qa/page.tsx` | 1,364 | Very Large |
| `app/Dashboard/page.tsx` | 793 | Large |
| `app/reports/page.tsx` | 570 | Medium |
| `app/cut/page.tsx` | 544 | Medium |
| `app/scan-qr/page.tsx` | 480 | Medium |
| `app/settings/page.tsx` | 413 | Medium |
| `app/scan/page.tsx` | 372 | Medium |
| `app/notifications/page.tsx` | 270 | Medium |
| `app/login/page.tsx` | 257 | Medium |
| `app/register/page.tsx` | 252 | Medium |

**Target**: every `page.tsx` should be **< 150 lines** and contain **zero API calls / business logic**.

### 1.3 Component Size Audit

| Component | Lines | Issue |
|-----------|-------|-------|
| `components/stats-bar.tsx` | 799 | API calls + multiple widgets |
| `components/ui/sidebar.tsx` | 726 | shadcn UI (keep) |
| `components/dashboard-sidebar.tsx` | 496 | Layout + nav logic |
| `components/top-bar.tsx` | 436 | User menu, brand switching, logout |
| `components/ui/chart.tsx` | 353 | shadcn UI (keep) |
| `components/active-pipeline.tsx` | 285 | Dashboard widget |
| `components/transmission-queue.tsx` | 280 | API calls |
| `components/missing-item-log.tsx` | 224 | API calls |

### 1.4 Duplicate & Dead Code Findings

**Duplicated patterns**

- `FLAG_ISSUES` / `FLAG_LABELS` arrays appear in 5+ files.
- `getRelevantTimeForBox()` appears in `Dashboard` and `checkpoints`.
- `formatPipelineStage()` / stage badge helpers appear in `transmission` and `transmission-queue`.
- `getDisplayNameFromEmail()` / `getInitials()` / user parsing utilities appear in `login`, `settings`, `top-bar`.
- `STAGE_ORDER` / stage metadata appear in `Dashboard`, `checkpoints`, `transmission`.
- `API_URL` env check is copy-pasted in 20+ files.

**Confirmed dead code**

- `components/ilms-test-panel.tsx`
- `components/missing-item-log.tsx` (despite API calls, not imported)
- `components/metrics-row.tsx`
- `components/import-modal.tsx`
- `components/book-info-card.tsx`
- `components/action-buttons.tsx`
- `components/session-log.tsx`
- `components/session-control.tsx`
- `app/box/[boxNumber]/` empty route directory
- `components/ui/use-mobile.tsx` (duplicate of `hooks/use-mobile.ts`)
- Unused auth-api helpers: `storeTokenData`, `getTokenData`, `isTokenExpired`, `getValidAccessToken`
- A large number of unused shadcn/ui primitives (accordion, alert-dialog, carousel, chart, etc.)

**Note on shadcn/ui primitives**: many are installed but unused. They are safe to keep for future UI work, but should be reviewed and removed from production builds if tree-shaking is not sufficient.

---

## 2. Target Architecture

The project does **not currently have a `src/` directory**. Adopting `src/` is recommended for cleaner separation but requires a one-time path migration. Two options are provided.

### Option A: Feature-Based with `src/` (Recommended for New Projects)

Update `tsconfig.json` paths to `"@/*": ["./src/*"]` and move:

```text
frontend/
├── public/
├── src/
│   ├── app/                         # Next.js App Router (required)
│   │   ├── (auth)/                  # route groups optional
│   │   ├── (dashboard)/
│   │   └── page.tsx
│   ├── components/
│   │   ├── common/                  # truly reusable UI
│   │   ├── layout/                  # sidebar, top-bar, protected-route
│   │   ├── forms/
│   │   └── feature/                 # feature-specific components
│   ├── features/                    # domain modules
│   │   ├── authentication/
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   ├── warehouse/
│   │   ├── locator/
│   │   ├── transmission/
│   │   ├── checkpoints/
│   │   ├── qa/
│   │   ├── reports/
│   │   └── scanning/
│   ├── hooks/                       # cross-cutting hooks
│   ├── services/                    # API service modules
│   ├── lib/                         # pure utilities + cn
│   ├── constants/
│   ├── types/
│   └── styles/
└── DEADCODES/                       # temporary graveyard
```

### Option B: Feature-Based Without `src/` (Lower Risk for This Codebase)

Keep the existing root-level `app/`, but reorganize everything else by feature. This avoids breaking Next.js conventions and requires fewer import changes.

```text
frontend/
├── app/                             # unchanged route tree
├── components/
│   ├── common/
│   ├── layout/
│   ├── forms/
│   └── feature/                     # dashboard/, inventory/, etc.
├── features/                        # new: domain modules
│   ├── authentication/
│   ├── dashboard/
│   ├── inventory/
│   ├── warehouse/
│   ├── locator/
│   ├── transmission/
│   ├── checkpoints/
│   ├── qa/
│   ├── reports/
│   └── scanning/
├── hooks/
├── services/                        # new
├── lib/
├── constants/                       # new
├── types/                           # new
├── styles/
└── DEADCODES/
```

**Recommendation**: Use **Option B** for this refactor to minimize route breakage, then consider moving to `src/` in a later, dedicated migration if desired.

---

## 3. Folder & File Rules

| Rule | Limit / Guideline |
|------|-------------------|
| `page.tsx` | < 150 lines, no API calls, no helpers, composition only |
| Component | < 200 lines |
| Hook | < 150 lines, single responsibility |
| Service | one module per domain, one function per endpoint group |
| Utility | pure functions only |
| Folder depth | max 4 levels under `features/` |
| Dead code | move to `DEADCODES/` first; delete after one sprint |
| Naming | kebab-case files, PascalCase components, camelCase hooks/utils |

---

## 4. Shared Infrastructure to Create First

Before touching pages, build the shared foundation.

### 4.1 Centralized Constants

Create `constants/index.ts` (or `lib/constants.ts`):

- `FLAG_ISSUES` / `FLAG_LABELS` — merge all lists, keep the superset.
- `STAGE_ORDER` / `STAGE_META` — single source of truth for pipeline stages.
- `STAGE_COLORS` — consolidate badge/colors maps.
- `BRAND_COLORS` — already in `hooks/use-brand.tsx`; can move here.
- `STORAGE_KEYS` — centralize localStorage keys (`ibooktrack_brand`, `ibooktrack_read_notifications`, etc.).

### 4.2 Shared Utilities

Create `lib/utils/`:

- `date.ts` — `formatTime`, `formatDate`, `isToday`, `startOfDay`.
- `box-time.ts` — `getRelevantTimeForBox` extracted from Dashboard/checkpoints.
- `user.ts` — `getDisplayNameFromEmail`, `getInitials`, `decodeStoredUser`.
- `pipeline.ts` — `formatPipelineStage`, `parseStatus`, `getPipelineStatusBadge`.
- Keep existing `lib/utils.ts` for `cn` only.

### 4.3 API Service Layer

Create `services/` modules, each wrapping `authFetch`:

- `services/auth.service.ts` — `login`, `register`, `logout`, `refreshToken`, `getCurrentUser`.
- `services/dashboard.service.ts` — stats, pipeline, live scans.
- `services/boxes.service.ts` — box CRUD, advance, send-forward, delete.
- `services/scanning.service.ts` — live scans, simflex status, scan rows.
- `services/storage.service.ts` — locations, assignments, rack/level ops.
- `services/transmission.service.ts` — summary, stages, ranking, export.
- `services/checkpoints.service.ts` — checkpoints, transitions.
- `services/qa.service.ts` — flag/unflag books.
- `services/reports.service.ts` — lot status report.
- `services/warehouse.service.ts` — lots, sessions, ISBN lookup SSE.

Each service function should accept typed params and return typed data. Reuse `getApiBaseUrl()` from `lib/auth-api.ts`.

### 4.4 Auth Module

Create `features/authentication/`:

```text
features/authentication/
├── components/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ForgotPasswordForm.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useProtectedRoute.ts
├── services/
│   └── auth.service.ts
├── utils/
│   └── auth-helpers.ts
└── types/
    └── auth.types.ts
```

Move auth-related logic out of `lib/auth-api.ts` into this module. Keep `authFetch` in `lib/auth-api.ts` as the global HTTP client.

### 4.5 Reusable UI / Layout Components

Move to `components/layout/`:

- `dashboard-sidebar.tsx`
- `top-bar.tsx`
- `protected-route.tsx`

Extract from `top-bar.tsx`:

- `UserMenu`
- `BrandSwitcher`
- `NotificationBell`

Move to `components/common/`:

- `page-header.tsx`
- `refresh-control.tsx`
- `pagination.tsx`
- `scanner-input.tsx`
- `QrScanner.tsx` (or `features/scanning/components`)

---

## 5. Page-by-Page Refactor Plan

### Phase 1 — Dashboard

**Goal**: prove the pattern on a single page before scaling.

Current: `app/Dashboard/page.tsx` (793 lines)

New structure:

```text
features/dashboard/
├── components/
│   ├── DashboardHeader.tsx
│   ├── DashboardStats.tsx
│   ├── DashboardCharts.tsx
│   ├── DashboardSearch.tsx
│   ├── DashboardPipeline.tsx
│   └── DashboardRecentActivity.tsx
├── hooks/
│   └── useDashboard.ts
├── services/
│   └── dashboard.service.ts
└── utils/
    └── dashboard.helpers.ts
```

`app/Dashboard/page.tsx` becomes:

```tsx
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { DashboardStats } from '@/features/dashboard/components/DashboardStats'
import { DashboardSearch } from '@/features/dashboard/components/DashboardSearch'
import { DashboardPipeline } from '@/features/dashboard/components/DashboardPipeline'

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader />
      <DashboardStats />
      <DashboardSearch />
      <DashboardPipeline />
    </>
  )
}
```

Steps:

1. Create `features/dashboard/` skeleton.
2. Move `DashboardMain.tsx` animation logic into a layout or the main page.
3. Extract `useDashboard` hook containing stats fetching, search state, and refresh logic.
4. Create service `dashboard.service.ts` for `/api/dashboard/*`, `/api/boxes`, `/api/scanning/*`.
5. Extract `DashboardSearch` (ISBN/lot search UI + results).
6. Extract `DashboardPipeline` from `components/active-pipeline.tsx` + page stage logic.
7. Extract `DashboardStats` from `components/stats-bar.tsx`.
8. Move old files to `DEADCODES/components/` and `DEADCODES/pages/`.

### Phase 2 — Inventory

Current: `app/inventory/page.tsx` (2,478 lines)

New structure:

```text
features/inventory/
├── components/
│   ├── InventoryHeader.tsx
│   ├── InventoryBoxList.tsx
│   ├── InventoryBoxRow.tsx
│   ├── InventoryBookList.tsx
│   ├── InventoryScanModal.tsx
│   ├── InventoryPrintSlip.tsx
│   └── InventoryDeleteModal.tsx
├── hooks/
│   └── useInventory.ts
├── services/
│   └── inventory.service.ts
├── utils/
│   └── inventory.helpers.ts
└── types/
    └── inventory.types.ts
```

Steps:

1. Extract `FLAG_ISSUES` to `constants/`.
2. Extract box fetching, search, expansion into `useInventory`.
3. Create `inventory.service.ts` for box endpoints and `/api/scanning/simflex-status`.
4. Extract book scanning + flagging UI into `InventoryScanModal`.
5. Extract print slip / QR generation into `InventoryPrintSlip`.
6. Extract delete confirmation into `InventoryDeleteModal`.
7. Compose `app/inventory/page.tsx` from 5-6 components + hook.

### Phase 3 — Authentication

Move auth pages from `app/login/`, `app/register/`, `app/forgot-password/` to feature-based components.

```text
features/authentication/
├── components/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ForgotPasswordForm.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useProtectedRoute.ts
├── services/
│   └── auth.service.ts
└── types/
    └── auth.types.ts
```

Steps:

1. Create `auth.service.ts` with `login`, `register`, `logout`, `refreshToken`, `getCurrentUser`.
2. Create `useAuth` hook for login/logout state and SSO handling.
3. Refactor `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx` to use forms.
4. Move `protected-route.tsx` to `components/layout/` or keep under auth feature.
5. Remove dead helpers from `lib/auth-api.ts`: `storeTokenData`, `getTokenData`, `isTokenExpired`, `getValidAccessToken`.

### Phase 4.1 — Remaining Stations

Apply the same extraction pattern to:

- `warehouse/page.tsx` (1,647 lines)
- `checkpoints/page.tsx` (2,158 lines)
- `transmission/page.tsx` (1,938 lines)
- `locator/page.tsx` (1,743 lines)
- `qa/page.tsx` (1,364 lines)
- `cut/page.tsx` (544 lines)
- `scan/page.tsx` (372 lines)
- `scan-qr/page.tsx` (480 lines)
- `reports/page.tsx` (570 lines)
- `settings/page.tsx` (413 lines)
- `notifications/page.tsx` (270 lines)

For each:

1. Create `features/<name>/` with `components/`, `hooks/`, `services/`, `utils/`, `types/`.
2. Move API calls to service module.
3. Move state to hook.
4. Split JSX into components (< 200 lines each).
5. Leave `page.tsx` as pure composition.

## Phase 4.2 — Remaining Stations: concrete extraction pattern

Use the same baseline for every station:

```text
features/<station>/
├── components/     # Presentational sections and modals; target <200 lines per file
├── hooks/          # Page orchestration, remote-state lifecycle, UI-state handlers
├── services/       # Typed `authFetch` API boundary; no React state
├── utils/          # Pure formatters, filters, selectors, parsing helpers
└── types/          # API/domain and component-prop types
```

Each route page should only own the application shell and composition:

```tsx
'use client'

import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { StationContent } from '@/features/<station>/components/StationContent'

export default function StationPage() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <StationContent />
      </main>
    </div>
  )
}
```

`StationContent` may invoke the feature hook and compose its feature-specific UI. This prevents route files from becoming a different kind of monolith due to passing a large hook object through several levels.

---

### 1. Warehouse

The current warehouse screen combines receiving-session setup, SSE ISBN lookup, book scanning, lot/box validation, flagging, completion, and several confirmation dialogs. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\warehouse\page.tsx" lines="125-190" /> Its API boundary includes warehouse sessions, iLMS lots, and the ISBN stream/query endpoints. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\warehouse\page.tsx" lines="204-220" />

```text
features/warehouse/
├── components/
│   ├── WarehouseContent.tsx
│   ├── WarehouseHeader.tsx
│   ├── WarehouseSessionSetup.tsx
│   ├── WarehouseActiveSession.tsx
│   ├── WarehouseSessionStats.tsx
│   ├── WarehouseScanner.tsx
│   ├── WarehouseScanLog.tsx
│   ├── WarehouseFlagModal.tsx
│   ├── WarehouseCompleteSessionModal.tsx
│   ├── WarehouseResetSessionModal.tsx
│   ├── WarehouseConflictModal.tsx
│   ├── WarehouseSimilarLotModal.tsx
│   └── WarehouseIlmsMismatchModal.tsx
├── hooks/
│   ├── useWarehouse.ts
│   └── useWarehouseIsbnStream.ts
├── services/
│   └── warehouse.service.ts
├── utils/
│   └── warehouse.helpers.ts
└── types/
    └── warehouse.types.ts
```

- **`useWarehouse`**: lot/box selection, session lifecycle, scan log, counter state, flagging, completion/reset workflow, and refresh state.
- **`useWarehouseIsbnStream`**: owns `EventSource`, cleanup, ISBN lookup state, and stream events. This deserves a separate hook because it is a resource lifecycle rather than ordinary UI state.
- **`warehouse.service.ts`**: `getIlmsLots`, `checkBoxExists`, `saveSession`, `updateSession`, `queryIsbn`, `startIsbnStream`, and related session operations.
- **`warehouse.helpers.ts`**: move `isValidIsbn`, lot/box normalization, similar-lot matching, and iLMS mismatch calculation from the current route. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\warehouse\page.tsx" lines="82-123" />

---

### 2. Checkpoints

This is effectively a pipeline-monitoring feature: it has pipeline stages/cards, transition logs, stage drill-down, box details, receive/send/advance/rollback operations, and Simflex checks. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\checkpoints\page.tsx" lines="216-254" />

```text
features/checkpoints/
├── components/
│   ├── CheckpointsContent.tsx
│   ├── CheckpointsHeader.tsx
│   ├── PipelineStageFlow.tsx
│   ├── PipelineStageCard.tsx
│   ├── PipelineLegend.tsx
│   ├── TransitionLogFilters.tsx
│   ├── TransitionLogTable.tsx
│   ├── TransitionTimeline.tsx
│   ├── BoxDetailsModal.tsx
│   ├── StageDetailsModal.tsx
│   ├── StationActionConfirmModal.tsx
│   ├── AdvanceValidationModal.tsx
│   └── UndoTransitionToast.tsx
├── hooks/
│   ├── useCheckpoints.ts
│   ├── usePipelineTransitions.ts
│   └── useCheckpointBoxDetails.ts
├── services/
│   └── checkpoints.service.ts
├── utils/
│   └── checkpoints.helpers.ts
└── types/
    └── checkpoints.types.ts
```

- **`useCheckpoints`**: top-level refresh, scan input/highlighting, action state, confirmation state, selected stage.
- **`usePipelineTransitions`**: transition filters, pagination, timeline expansion, transition data loading.
- **`useCheckpointBoxDetails`**: selected box, book details, per-ISBN Simflex status, and on-demand check operation.
- **`checkpoints.service.ts`**: boxes/pipeline transitions, receive/send/advance/rollback, scan/transmit rows, live scanning data, Simflex status, and check-Simflex actions. These calls are currently scattered throughout the page. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\checkpoints\page.tsx" lines="335-354" />

Keep `STAGE_ORDER`, stage metadata, status calculations, date filters, and timeline helpers in `utils/checkpoints.helpers.ts`; their current role is pure display/domain derivation. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\checkpoints\page.tsx" lines="32-76" />

---

### 3. Transmission

Transmission has four distinct views: summary metrics/stage breakdown, live scan feed, machine view, and lot transmission visibility, plus ranking and flagging dialogs. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\transmission\page.tsx" lines="747-914" />

```text
features/transmission/
├── components/
│   ├── TransmissionContent.tsx
│   ├── TransmissionHeader.tsx
│   ├── TransmissionFilters.tsx
│   ├── TransmissionMetrics.tsx
│   ├── TransmissionStageBreakdown.tsx
│   ├── TransmissionTabs.tsx
│   ├── LiveScanFeed.tsx
│   ├── MachinePerformanceTable.tsx
│   ├── LotSelector.tsx
│   ├── LotTransmissionSummary.tsx
│   ├── TransmissionBookTable.tsx
│   ├── RankingModal.tsx
│   └── TransmissionFlagModal.tsx
├── hooks/
│   ├── useTransmission.ts
│   ├── useTransmissionLot.ts
│   └── useMachineBooks.ts
├── services/
│   └── transmission.service.ts
├── utils/
│   └── transmission.helpers.ts
└── types/
    └── transmission.types.ts
```

- **`useTransmission`**: live data, date filters, stage/table filters, ranking/export state, and refresh.
- **`useTransmissionLot`**: lot search, selected lot/box, pagination, and summary retrieval.
- **`useMachineBooks`**: machine selection and machine-book request lifecycle.
- **`transmission.service.ts`**: `/api/scanning/live`, `machine-books`, `ranking`, `export`, lots/search/summary, tag updates, and iLMS enrichment. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\transmission\page.tsx" lines="300-352" />
- **`transmission.helpers.ts`**: `formatPipelineStage`, `parseStatus`, and badge/status mapping. Keep badge components out of helpers; make helpers return status metadata and render it in components. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\transmission\page.tsx" lines="75-158" />

---

### 4. Locator

Locator is a storage-layout feature, with location grid management, storage assignment, pending-assignment confirmation, search, capacity management, and section/rack/level provisioning. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\locator\page.tsx" lines="88-159" />

```text
features/locator/
├── components/
│   ├── LocatorContent.tsx
│   ├── LocatorHeader.tsx
│   ├── LocatorSearch.tsx
│   ├── LocatorSearchResults.tsx
│   ├── StorageLegend.tsx
│   ├── StorageGrid.tsx
│   ├── StorageSectionControls.tsx
│   ├── StorageSlot.tsx
│   ├── ReadyBoxList.tsx
│   ├── PendingAssignmentList.tsx
│   ├── StorageSlotDetailsModal.tsx
│   ├── AssignBoxesModal.tsx
│   ├── StorageTopologyConfirmModal.tsx
│   └── LocatorWarningModal.tsx
├── hooks/
│   ├── useLocator.ts
│   ├── useStorageSearch.ts
│   └── useStorageTopology.ts
├── services/
│   └── locator.service.ts
├── utils/
│   └── locator.helpers.ts
└── types/
    └── locator.types.ts
```

- **`useLocator`**: locations/ready/pending data, active section, slot detail, assignment/removal state, shared refresh.
- **`useStorageSearch`**: search value, classification, validation, results, and highlighted cells.
- **`useStorageTopology`**: add/remove section/rack/level, capacity edits, and confirmation/warning state.
- **`locator.service.ts`**: location retrieval/provision/update/delete, ready and pending boxes, search, assignment batch operations, and confirmation. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\locator\page.tsx" lines="161-201" />
- **`locator.helpers.ts`**: slot lookup, capacity calculations, grid/rack/level derivation, labels, and search-result mapping.

Remove the unrelated `DashboardMain` import while doing this refactor; it is currently present in the locator route but not part of locator behavior. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\locator\page.tsx" lines="14-18" />

---

### 5. QA / Endorsement

QA contains three feature sections—incoming, active inspection, and outgoing—with a nested inspection-session scanner workflow. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\qa\page.tsx" lines="695-793" />

```text
features/qa/
├── components/
│   ├── QaContent.tsx
│   ├── QaHeader.tsx
│   ├── QaSearch.tsx
│   ├── QaTabs.tsx
│   ├── IncomingBoxes.tsx
│   ├── InspectionBoxList.tsx
│   ├── InspectionSession.tsx
│   ├── InspectionStats.tsx
│   ├── InspectionScanner.tsx
│   ├── InspectionComparisonTables.tsx
│   ├── OutgoingBoxes.tsx
│   ├── InspectionFlagModal.tsx
│   ├── CompleteInspectionModal.tsx
│   └── QaActionConfirmModal.tsx
├── hooks/
│   ├── useQa.ts
│   └── useInspectionSession.ts
├── services/
│   └── qa.service.ts
├── utils/
│   └── qa.helpers.ts
└── types/
    └── qa.types.ts
```

- **`useQa`**: tab/search state, incoming/endorsement lists, receive/send actions, expanded boxes, and refresh.
- **`useInspectionSession`**: start/resume, warehouse-scan comparison data, scanning, flags, session totals, and completion.
- **`qa.service.ts`**: stage-box listing, advance/send, box details, warehouse scans, resume session, iLMS ISBN search, scan, and complete. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\qa\page.tsx" lines="314-345" />
- Move `FLAG_ISSUES` to a shared constant, not a QA-local helper. It is already duplicated in Warehouse and Transmission. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\qa\page.tsx" lines="22-44" />

Recommended shared location:

```text
constants/
└── book-flag-issues.ts
```

---

### 6. Cut

Cut and Scan share the same station-transfer shape, but should start as separate features because their workflows and stage semantics differ.

```text
features/cut/
├── components/
│   ├── CutContent.tsx
│   ├── CutHeader.tsx
│   ├── CutSearch.tsx
│   ├── CutTabs.tsx
│   ├── IncomingCutBoxList.tsx
│   ├── CutWorkQueue.tsx
│   ├── CutBoxRow.tsx
│   ├── CutBoxBooks.tsx
│   └── CutActionConfirmModal.tsx
├── hooks/
│   └── useCut.ts
├── services/
│   └── cut.service.ts
├── utils/
│   └── cut.helpers.ts
└── types/
    └── cut.types.ts
```

- **`useCut`**: query/type/tab state, incoming/outgoing data, expanded box/book cache, receive/send progress, and confirmation state.
- **`cut.service.ts`**: `listBoxes`, `getBox`, `receiveBox`, and `sendBoxForward`.
- **`cut.helpers.ts`**: stage-query construction and lot filtering.

The present route already has clean domain seams: incoming Inventory boxes with `sent` sessions, active Cut boxes without a sent session, and a lazy-loaded book list. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\cut\page.tsx" lines="100-139" />

---

### 7. Scan

```text
features/scan/
├── components/
│   ├── ScanContent.tsx
│   ├── ScanHeader.tsx
│   ├── ScanSearch.tsx
│   ├── IncomingScanBoxList.tsx
│   ├── ScanBoxRow.tsx
│   ├── ScanBoxBooks.tsx
│   └── ScanReceiveConfirmModal.tsx
├── hooks/
│   └── useScan.ts
├── services/
│   └── scan.service.ts
├── utils/
│   └── scan.helpers.ts
└── types/
    └── scan.types.ts
```

- **`useScan`**: search/filter state, incoming boxes, expanded box/book cache, receipt action, and refresh.
- **`scan.service.ts`**: `listIncomingBoxes`, `getBox`, `receiveBox`.
- **`scan.helpers.ts`**: lot match and incoming box/session predicates.

The current page is comparatively small, but it still combines data access, lazy detail loading, filtering, confirmation, and rendering. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\scan\page.tsx" lines="72-150" />

---

### 8. Scan QR

This is independent from the Scan station transfer page: it parses QR labels, looks up barcode ISBNs, and renders two scan-result card types. Keep parsing and display isolated.

```text
features/scan-qr/
├── components/
│   ├── ScanQrContent.tsx
│   ├── ScanQrHeader.tsx
│   ├── ScanQrCamera.tsx
│   ├── QrResultCard.tsx
│   ├── BarcodeResultCard.tsx
│   ├── ScanResultList.tsx
│   └── ScanResultTable.tsx
├── hooks/
│   └── useQrScanner.ts
├── services/
│   └── scan-qr.service.ts
├── utils/
│   └── scan-qr.helpers.ts
└── types/
    └── scan-qr.types.ts
```

- **`useQrScanner`**: scanner result state, barcode lookup lifecycle, result removal, navigation/back state.
- **`scan-qr.service.ts`**: `lookupIsbn`.
- **`scan-qr.helpers.ts`**: `parseQr`, rejection label lookup, scan-result guards, and QR/barcode mapping.
- Move `HeaderCell`, `BodyCell`, and `StatusBadge` into their consuming table/card components rather than treating them as generic feature utilities. The parser and result types are currently in the route file. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\scan-qr\page.tsx" lines="22-88" />

---

### 9. Reports

Reports has one remote dataset, but distinct UI responsibilities: status summary, filter/search/sort controls, expandable lot rows, and paginated box detail. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\reports\page.tsx" lines="67-149" />

```text
features/reports/
├── components/
│   ├── ReportsContent.tsx
│   ├── ReportsHeader.tsx
│   ├── ReportStatusSummary.tsx
│   ├── ReportFilters.tsx
│   ├── LotStatusTable.tsx
│   ├── LotStatusRow.tsx
│   └── LotBoxDetails.tsx
├── hooks/
│   └── useReports.ts
├── services/
│   └── reports.service.ts
├── utils/
│   └── reports.helpers.ts
└── types/
    └── reports.types.ts
```

- **`useReports`**: fetch state, filter/search/sort, expanded lots, per-lot pagination.
- **`reports.service.ts`**: `getLotStatus(brand)`.
- **`reports.helpers.ts`**: `formatTime`, computed progress, filtering/sorting, status metadata.
- Keep `STATUS_META` as serializable metadata in helpers/constants and render its icons only within components. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\reports\page.tsx" lines="48-65" />

---

### 10. Settings

Settings has profile and password forms, profile picture local persistence, and user-display derivation.

```text
features/settings/
├── components/
│   ├── SettingsContent.tsx
│   ├── SettingsTabs.tsx
│   ├── ProfileSettingsForm.tsx
│   ├── PasswordSettingsForm.tsx
│   └── ProfileAvatarEditor.tsx
├── hooks/
│   ├── useSettings.ts
│   └── useProfilePicture.ts
├── services/
│   └── settings.service.ts
├── utils/
│   └── settings.helpers.ts
└── types/
    └── settings.types.ts
```

- **`useSettings`**: profile loading, active tab, profile/password form state, submission state/messages.
- **`useProfilePicture`**: file reading and the browser-local profile-picture persistence behavior.
- **`settings.service.ts`**: `getProfile`, `updateProfile`, `updatePassword`.
- **`settings.helpers.ts`**: `getDisplayNameFromEmail`, `getInitials`, stored-user parsing, and token payload decoding. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\settings\page.tsx" lines="20-84" />

**Important:** `USER_STORAGE_KEY`, `parseStoredUser`, and `decodeTokenUser` appear unused in this route excerpt. Verify references before moving them; delete rather than preserve dead code if they have no callers.

---

### 11. Notifications

Notifications should not gain a feature service until the underlying `useLiveNotifications` hook is also refactored. The page itself does not make API requests; it consumes that shared live-data hook. <ref_snippet file="C:\Users\MUSTANG-OJT\Documents\GitHub\iBookTrack\frontend\app\notifications\page.tsx" lines="65-93" />

```text
features/notifications/
├── components/
│   ├── NotificationsContent.tsx
│   ├── NotificationsHeader.tsx
│   ├── NotificationFilters.tsx
│   ├── NotificationList.tsx
│   ├── NotificationCard.tsx
│   └── NotificationsEmptyState.tsx
├── hooks/
│   └── useNotifications.ts
├── services/
│   └── notifications.service.ts
├── utils/
│   └── notifications.helpers.ts
└── types/
    └── notifications.types.ts
```

- **`useNotifications`**: wraps `useLiveNotifications`, owns dismissed IDs, selected filter, visible/filtered lists, type counts, and dismiss behavior.
- **`notifications.service.ts`**: only create it when extracting API/polling behavior out of `useLiveNotifications`; otherwise leave it intentionally empty/not created rather than adding a placeholder module.
- **`notifications.helpers.ts`**: notification type display metadata and count/filter helpers.
- **`NotificationCard`**: renders status style and handles mark-read/dismiss callbacks.

---

## Shared extraction rules

1. **Do not duplicate station-transfer logic indefinitely.**
   Cut, QA, and Scan all call box listing/detail/advance/send-forward endpoints. Keep each station service initially for controlled migration, then introduce a shared `features/boxes/services/box-workflow.service.ts` only after their request/response contracts are typed and demonstrably identical.

2. **Move repeated flag definitions now.**
   `FLAG_ISSUES` is duplicated in Warehouse, QA, and Transmission. Create a single `constants/book-flag-issues.ts` and reuse its `BookFlagIssue` type.

3. **Do not put JSX-returning helpers in `utils/`.**
   Functions such as Transmission’s badge helpers should become data helpers plus small rendering components. Utilities should stay framework-independent and testable.

4. **Keep feature types feature-local first.**
   Promote only real cross-feature shapes—such as box/session/book records—to a shared domain type after confirming compatibility. The current station pages use subtly different box/session projections.

5. **Migrate station-by-station, preserving API behavior.**
   For each station: introduce types → service → hook → components → composition-only page → remove old extracted route code. Avoid moving to `DEADCODES` until TypeScript/build validation confirms no remaining imports.

This decomposition aligns with the actual existing boundaries: warehouse sessions and stream scanning, checkpoint pipeline transitions, transmission telemetry, locator storage topology, QA inspection sessions, and the simpler transfer/report/settings/notification screens.

### Phase 5 — Layout & Common Components

1. Move `dashboard-sidebar.tsx` and `top-bar.tsx` to `components/layout/`.
2. Extract `UserMenu`, `BrandSwitcher`, `NotificationBell` from `top-bar.tsx`.
3. Move `protected-route.tsx` to `components/layout/`.
4. Move `page-header.tsx`, `refresh-control.tsx`, `pagination.tsx`, `scanner-input.tsx`, `QrScanner.tsx` to `components/common/` (or `features/scanning/` for scanner-specific).
5. Keep `components/ui/` for shadcn/ui primitives. Review unused primitives and remove if desired.

### Phase 6 — Dead Code Removal

1. Create `DEADCODES/` at project root.
2. Move confirmed dead components/pages into `DEADCODES/` subfolders.
3. Update `notes.md` with reason and date.
4. After one sprint, delete `DEADCODES/`.

Confirmed safe to move now:

- `components/ilms-test-panel.tsx`
- `components/missing-item-log.tsx`
- `components/metrics-row.tsx`
- `components/import-modal.tsx`
- `components/book-info-card.tsx`
- `components/action-buttons.tsx`
- `components/session-log.tsx`
- `components/session-control.tsx`
- `components/ui/use-mobile.tsx`
- `app/box/[boxNumber]/` directory

---

## 6. Immediate Quick Wins (Can Be Done in One PR)

1. **Centralize `FLAG_ISSUES`** into `constants/flag-issues.ts` and import everywhere.
2. **Centralize `STAGE_ORDER` / `STAGE_META`** into `constants/pipeline.ts`.
3. **Remove duplicate `use-mobile.tsx`** from `components/ui/`.
4. **Remove dead auth helpers**: `storeTokenData`, `getTokenData`, `isTokenExpired`, `getValidAccessToken`.
5. **Standardize API URL handling**: replace inline `process.env.NEXT_PUBLIC_API_URL` checks with `getApiBaseUrl()`.
6. **Create shared utilities**: `date.ts`, `user.ts`, `box-time.ts`, `pipeline.ts`.
7. **Remove empty `app/box/[boxNumber]/` directory**.
8. **Move dead custom components** to `DEADCODES/`.

---

## 7. Verification Steps

After each phase:

1. `npm run lint` or `npm run build` to catch import/type errors.
2. `npx tsc --noEmit` for TypeScript validation.
3. Manual smoke test of the refactored page.
4. Optional: run `npx depcheck` to find unused dependencies.
5. Optional: run `npx ts-prune` to find unused exports.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking imports during move | Do one feature per PR; rely on TypeScript and Next.js build errors |
| Hidden dynamic imports / string routes | Search for dynamic `import()` and route strings before deleting files |
| Tests missing | Add component-level smoke tests after extraction if test infra is added |
| Large PRs | Split by phase; never refactor more than one major page per PR |
| Runtime behavior changes | Keep business logic identical during move; optimize later |

---

## 9. Suggested First PR

Title: `refactor(frontend): centralize constants, remove dead code, and flatten API URL usage`

Scope:

- Create `constants/` with `flag-issues.ts`, `pipeline.ts`, `storage-keys.ts`.
- Create `lib/utils/date.ts`, `user.ts`, `box-time.ts`, `pipeline.ts`.
- Remove dead auth helpers.
- Remove duplicate `components/ui/use-mobile.tsx`.
- Delete empty `app/box/[boxNumber]/`.
- Move 8 dead components to `DEADCODES/`.
- Update `lib/auth-api.ts` exports.

This PR is low-risk and sets the foundation for the larger page refactors.

---

## 10. Rule for the Team

> **No page file should contain API calls, business logic, helper functions, or components exceeding 200 lines.**
>
> Pages compose. Hooks hold state. Services call APIs. Utilities calculate. Components render.
