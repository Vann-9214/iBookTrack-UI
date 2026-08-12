# iBookTrack

A unified Warehouse Management System (WMS) and Executive Dashboard developed for
Innodata. Synchronizes the physical book digitization workflow (8-stage pipeline)
with real-time backend data to eliminate inventory loss and replace Excel-based
QA logs.

## 📚 Documentation

Full turnover documentation lives in the [`docs/`](./docs) directory:

- 📖 **[docs/README.md](./docs/README.md)** — Start here for the Documentation Index.
- 🏗️ **[docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md)** — High-level architecture, the 8-stage pipeline, and core features.
- ⚙️ **[docs/architecture/BACKEND.md](./docs/architecture/BACKEND.md)** — Database schema, API services, and backend architecture.
- 🖥️ **[docs/architecture/FRONTEND.md](./docs/architecture/FRONTEND.md)** — UI components, state management, and routing.
- 🚀 **[docs/guides/MIGRATION_GUIDE.md](./docs/guides/MIGRATION_GUIDE.md)** — Step-by-step deployment guide.
- 🤝 **[docs/TEAM_AND_CREDITS.md](./docs/TEAM_AND_CREDITS.md)** — Team members and their contributions.

*Note: Clean PDF versions of all documentation are available in [`docs/pdf/`](./docs/pdf/).*

## 🛠 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui
- **Backend:** Node.js 20+, Express 4 (ES modules)
- **Database:** Vanilla PostgreSQL (with custom JWT Authentication)
- **External:** Innodata Simflex WMS API, iLMS metadata API

## 🚀 Quick Start

```powershell
# 1. Install dependencies
cd backend  && npm install
cd ../frontend && npm install

# 2. Configure Environment
# Copy .env.example to .env at the root and fill in your PostgreSQL credentials.

# 3. Setup Database
# Run the SQL migration files in backend/migrations/ sequentially on your database.

# 4. Start Servers (in separate terminals)
cd backend  && npm run dev      # http://localhost:5000
cd frontend && npm run dev      # http://localhost:3000
```

## 📋 Core Modules

1. **Live Executive Dashboard** — Real-time Mustang/Jaguar status reports.
2. **Smart Intake** — ISBN-to-Lot validation via backend sync.
3. **Chain of Custody** — Digital station handshakes to stop book loss.
4. **QA Remark Portal** — Direct database flagging (replacing Excel logs).
5. **Hash-Check Guard** — Verified PDF transmission monitor.

## 🤝 Project Team (OJT Interns)

For full credits on the developers (Ivan, Divan, John, and Manwa) and their specific roles, please see the [Team & Credits](./docs/TEAM_AND_CREDITS.md) page.

Built with Windsurf AI pair-programming.
