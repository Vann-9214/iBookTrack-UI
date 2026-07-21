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

### Phase 4 — Remaining Stations

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
