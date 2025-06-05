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
