# iBookTrack

A unified Warehouse Management System (WMS) and Executive Dashboard developed for
Innodata. Synchronizes the physical book digitization workflow (8-stage pipeline)
with real-time backend data to eliminate inventory loss and replace Excel-based
QA logs.

## 📚 Documentation

Full turnover documentation lives in [`docs/`](./docs):

- [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) — start here. Architecture,
  setup, environment variables, known loopholes, common ops.
- [`docs/FRONTEND.md`](./docs/FRONTEND.md) — every page, component, hook in `frontend/`.
- [`docs/BACKEND.md`](./docs/BACKEND.md) — every route, service, schema in `backend/`.
- [`docs/MIGRATION_GUIDE.md`](./docs/MIGRATION_GUIDE.md) — step-by-step migration
  to a new server / database / hosting provider.

## 🛠 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui
- **Backend:** Node.js 20+, Express 4 (ES modules)
- **Database:** Neon PostgreSQL (with custom Auth via JWT)
- **External:** Innodata Simflex WMS API, iLMS metadata API

## 🚀 Quick Start

```powershell
# 1. Install
cd backend  && npm install
cd ../frontend && npm install

# 2. Configure (copy .env.example → .env and fill in DB keys)

# 3. Run migrations in your PostgreSQL client (backend/migrations/001..025 in order)

# 4. Start (two terminals)
cd backend  && npm run dev      # http://localhost:5000
cd frontend && npm run dev      # http://localhost:3000
```

Detailed steps in [`docs/PROJECT_OVERVIEW.md §4`](./docs/PROJECT_OVERVIEW.md#4-local-development--from-zero).

## 📋 Core Modules

1. **Live Executive Dashboard** — real-time Mustang/Jaguar status reports.
2. **Smart Intake** — ISBN-to-Lot validation via backend sync.
3. **Chain of Custody** — digital station handshakes to stop book loss.
4. **QA Remark Portal** — direct database flagging (replacing Excel logs).
5. **Hash-Check Guard** — verified PDF transmission monitor.

## 🤝 Project Team (OJT Interns)

- **John Rey Cutab**
- **Manwarul Francis Santos**

Built with Windsurf AI pair-programming.
