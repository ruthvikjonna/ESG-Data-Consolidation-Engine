# ESG Data Infrastructure Platform (MVP)

A foundational platform for ingesting, normalizing, and tracing ESG (Environmental, Social, and Governance) data. This MVP allows pilot users to securely submit ESG metrics from spreadsheets or forms — with full traceability for source, timestamp, and user.

## Vision

Modern ESG reporting is fragmented, manual, and difficult to audit. This project is building the infrastructure layer for ESG data, enabling structured intake, traceability, and automation from day one.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, TailwindCSS
- **Backend:** Supabase (PostgreSQL, Auth, Row-Level Security)
- **Hosting:** Vercel or Netlify

## Core Features

- ESG data form submission (company, metric, value, source)
- Secure user-level data separation with Supabase Auth + RLS
- Audit-friendly metadata (who entered what, when, and from where)
- Integration-ready (Google Sheets, Zapier, SAP, etc.)
- Dashboard for tracking data quality and completeness

## Supabase Auth + RLS Setup

### 1. Add user_id column to esg_data
```sql
alter table esg_data add column if not exists user_id uuid references auth.users(id);
```

### 2. Enable Row Level Security (RLS)
```sql
alter table esg_data enable row level security;
```

### 3. Add RLS Policy (user isolation)
```sql
create policy "Users can access their own ESG data"
on esg_data
for all
using (user_id = auth.uid());
```

### 4. Enable Auth Providers
- In the Supabase dashboard, go to Authentication > Providers.
- Enable Email/Password and any OAuth providers you want (Google, GitHub, etc.).

### 5. Testing
- Sign up as a user, submit data, and verify only your data is visible.

## Data Model: Source-Specific and Normalized Tables

### 1. SAP Raw Data Table
```sql
create table if not exists sap_raw_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  raw_data jsonb not null,
  source_system text default 'SAP',
  pull_time timestamptz default now(),
  created_at timestamptz default now()
);
```

### 2. Normalized ESG Data Table
```sql
create table if not exists normalized_esg_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  source_system text,
  company_name text,
  metric_type text,
  value numeric,
  units text,
  original_data jsonb,
  normalized_at timestamptz default now(),
  created_at timestamptz default now()
);
```

### Normalization Pipeline Flow
- Ingest raw SAP data into sap_raw_data (raw_data column)
- Run normalization job (TypeScript or SQL):
  - Reads from sap_raw_data.raw_data
  - Maps/cleans/transforms fields
  - Writes to normalized_esg_data
- Expose normalized_esg_data via API for BI/reporting
