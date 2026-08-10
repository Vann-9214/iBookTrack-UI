# iBookTrack — Project Overview

> A unified Warehouse Management System (WMS) and Executive Dashboard built for Innodata's physical book digitization workflow. iBookTrack tracks every book through an 8-stage pipeline from arrival (Warehouse) to final Storage, eliminating inventory loss and replacing outdated Excel-based logs.

## 📖 What is iBookTrack?

iBookTrack was created to solve the complex logistical challenges of managing physical books during the digitization process. Before iBookTrack, tracking books relied on manual Excel sheets, which led to missing books, unaccounted inventory, and slow QA processes. 

iBookTrack provides:
- **Real-Time Tracking:** Know exactly where every book is in the warehouse at any given second.
- **Chain of Custody:** Strict digital handshakes between stations ensure books cannot be lost in transit.
- **Executive Dashboard:** Live metrics, charts, and transmission queues for managers to monitor the entire operation.
- **Integrated QA:** Seamless flagging of damaged or unprocessable books directly in the system.

---

## 🔄 The 8-Stage Pipeline

The core of iBookTrack is its strict 8-stage pipeline. Books move sequentially through these stations, ensuring a perfect chain of custody.

| Stage | Name | Function |
|---|---|---|
| **1** | **Warehouse** | Initial receiving. Books are scanned into the system and immediately checked for processability. |
| **2** | **Inventory** | Handshake checkpoint. Confirms the books have been officially accepted into inventory. |
| **3** | **Cut** | Handshake checkpoint. Books are sent to the cutting station to have their bindings removed. |
| **4** | **Endorsement (QA)** | Rigorous QA inspection. Every book is checked for missing pages, blurriness, or physical damage. |
| **5** | **Scan** | Handshake checkpoint. Books are handed off to the high-speed scanning machines. |
| **6** | **Transmit** | Transmission monitor. Ensures the digital PDFs have successfully reached the final servers. |
| **7** | **Storage** | Final archival. Books are placed into physical storage bins. |

---

## ⚡ Core Features

- **Live Executive Dashboard:** A central hub showing active lots, books in the pipeline, daily transmissions, and flagged items.
- **Smart Barcode Scanning:** Integrated barcode scanning (with mobile and QR support) for lightning-fast book intake and tracking.
- **Missing Item Log:** A dedicated portal to track books that were flagged during QA, with exact reasons (e.g., torn pages, bleed-through).
- **Warehouse Locator:** A tool to instantly look up the physical bin location of any book or lot in the warehouse.

---

## 🛠️ Technology Stack

iBookTrack is built with modern, performant web technologies:

- **Frontend:** Next.js 15, React 19, Tailwind CSS v4. Designed to be fast, responsive, and mobile-friendly.
- **Backend:** Node.js, Express.js. A robust REST API handling business logic and live polling.
- **Database:** Vanilla PostgreSQL. A strictly constrained relational database ensuring data integrity across the pipeline.
- **Authentication:** Custom JWT-based security system.

---

## 📚 Developer Documentation

For developers looking to maintain, deploy, or extend iBookTrack, please refer to the detailed technical documentation:

- 🏗️ **[Frontend Architecture](./architecture/FRONTEND.md)**
- ⚙️ **[Backend Architecture](./architecture/BACKEND.md)**
- 🚀 **[Migration & Deployment Guide](./guides/MIGRATION_GUIDE.md)**
- 🤝 **[Team & Credits](./TEAM_AND_CREDITS.md)**
