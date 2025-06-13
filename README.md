# ESG Data Infrastructure Platform (MVP)
A foundational platform for ingesting, organizing, and previewing ESG (Environmental, Social, and Governance) data. This MVP enables users to upload ESG metrics from various file formats, view raw data in a centralized dashboard, and prepare for future API integrations.

## Vision

Modern ESG reporting is fragmented, manual, and hard to trace. This project aims to centralize ESG data ingestion and display, providing the groundwork for auditability, normalization, and automation.


## Tech Stack

- **Frontend:** Next.js, React, TypeScript, TailwindCSS
- **Backend:** Supabase (PostgreSQL, Auth, Row-Level Security)
- **Hosting:** Vercel

## MVP Features (Phase 1)

### Raw Data Ingestion

- Manual uploads: CSV, Excel, JSON
- Source tagging (Workday, QuickBooks, SAP, etc.)
- Authenticated upload UI (via Supabase Auth)
- Backend endpoint: `/api/ingest` for file handling
- Stores parsed data with:
  - `user_id`
  - `source_system`
  - `ingested_at`
  - `raw_data` (JSONB)

### Raw Data Display

- Dynamic column rendering (no schema enforcement)
- Source system filter (dropdown)
- Table with pagination and sorting
- Ingest timestamp column (formatted)
- Manual refresh and post-upload reload

### API Integrations (Planned)

- QuickBooks: Token-based sandbox
- Workday: Sample API key pull
- Google Sheets: OAuth or shared link