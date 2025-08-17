# ESG Data Consolidation Engine MVP
> **A comprehensive ESG data integration platform built over the course of 17 days** | *Pivoted after sending 624 outreach emails, conducting 24+ customer interviews, and receiving pilot interest from the [University of Wisconsin System](https://www.wisconsin.edu/), [Seaman Paper](https://www.seamanpaper.com/), and [Tosca](https://www.toscaltd.com/)*


## Project Overview
Bloom is a unified data infrastructure platform that solves **ESG data fragmentation**, a critical pain point identified through extensive customer research. The platform enables seamless integration of ESG data from multiple sources (Excel, Google Sheets, QuickBooks, manual uploads) into a centralized, standardized format for analysis and reporting.

### The Problem We Solved
**ESG Data Fragmentation**: Companies struggle with ESG data scattered across multiple systems, formats, and sources. This fragmentation leads to:
- Inconsistent data formats and standards
- Manual data consolidation processes
- Difficulty in generating comprehensive ESG reports
- Compliance challenges with ESG regulations
- Time-consuming data validation and cleaning

### Customer Research & Validation
- **24+ customer interviews** with sustainability managers, ESG consultants, and compliance officers
- **3 MVP iterations**: No-code (Zapier + Google Sheets), V1 (hard-coded), V2 (full-stack)
- **Key insights**: While the pain point was real, customers weren't willing to pay for the solution at scale
- **Decision to pivot**: After 2.5 weeks of interviews, development, and reiteration, we moved to a different sustainability-focused opportunity ([Climate Intervention Coordination System](https://github.com/ruthvikjonna/Climate-Intervention-Coordination-System)!)

## Product Highlights
- **Multi-Source Data Ingestion** – Excel, Google Sheets, QuickBooks, and manual uploads  
- **Authentication & Token Flows** – Secure, refreshable OAuth2 handling for all integrations  
- **Real-Time Preview** – Live UI feedback on parsed file structures, schema mismatches, and cleaning issues  
- **Data Validation Engine** – Type checking, formatting correction, and conversion logic  
- **Unified API Architecture** – Six modular endpoints cover all integration scenarios  
- **Pivot-Driven Architecture** – Rapid MVP cycles informed by 24+ live customer interviews 

## Architecture & Stack

### Frontend
- **Framework**: Next.js 15 + React 19 + TypeScript  
- **UI**: Tailwind CSS, responsive design, loading states, modular component layout  
- **Auth**: Supabase Auth with role-based access support  

### Backend
- **Framework**: Next.js API Routes (Node.js)  
- **Data Pipeline**: Real-time parsing, validation, and persistence  
- **Security**: OAuth2 flows with Microsoft, Google, and Intuit  

### Integrations
- **Microsoft Excel (Graph API)**: Sheets, tables, and OneDrive auth  
- **Google Sheets API**: Realtime fetch and parsing  
- **QuickBooks API**: Company, invoice, account, and vendor data  
- **Manual Uploads**: CSV, Excel (.xlsx), and JSON parsing  

### Data & Infra
- **Database**: Supabase PostgreSQL  
- **Validation**: File parsing, structure normalization, and transformation utils  
- **Logging**: Robust server-side error capture and user-facing messages  
- **CI/CD**: GitHub Actions + local `.env` templates  

## Technical Implementation

### Modular Integration Engine
- **Node.js backend modules** handle authentication, data fetching, and disconnect flows  
- **Unified service config** allows pluggable support for Excel, Google Sheets, QuickBooks, and manual uploads  
- **OAuth flows** follow provider-specific scopes and token lifecycles  

### Data Normalization Pipeline
- **Real-time parsing and structure flattening** for CSV, XLSX, JSON  
- **Auto-detection** of data types and column inconsistencies  
- **Schema validation logic** ensures clean, standardized tables before ingestion  
- **Normalized output** is written to Supabase PostgreSQL for querying  

### Live Data Preview & Validation UI
- **Frontend renders upload previews** and warns of missing headers or format errors  
- **Operators can review and approve** before saving  
- **UI built** in React 19 + Tailwind with real-time file feedback  

### Service-Specific Fetch Logic
- **Google Sheets**: Supports multi-sheet traversal, header inference, and on-demand fetch  
- **Microsoft Excel**: Accesses OneDrive files using Microsoft Graph; supports range targeting  
- **QuickBooks**: Extracts structured JSON from accounts, bills, customers, and invoices  

### Supabase Integration & Auth
- **User sessions** managed via Supabase Auth with token-secure client-side access  
- **Row-level access logic** designed for future multi-org support  
- **All data writes** authenticated and scoped to user identity  

## Core API Endpoints
Bloom exposes a unified RESTful backend that powers all ESG data ingestion, transformation, and integration workflows. The API handles OAuth authentication, data retrieval from connected services (Google Sheets, Excel, QuickBooks), real-time file parsing, schema validation, and secure persistence to Supabase. Designed for modularity and extensibility, the architecture supports both automated and manual data pipelines, enabling rapid onboarding of new ESG data sources with minimal integration overhead.

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project with database URL and anon/public key
- Microsoft Azure App (for Excel integration)
- Google Cloud Project (for Google Sheets)
- Intuit Developer App (for QuickBooks)

### Quickstart
```bash
git clone https://github.com/<yourusername>/esg-data-consolidation-engine.git
cd esg-data-consolidation-engine
npm install
```

### Final Thoughts
Bloom isn’t just another ESG tool—it’s the missing infrastructure layer for fragmented sustainability data. Built in 17 days across 3 MVPs, it reflects a rapid, research-driven approach to solving real ESG reporting pain. While we ultimately pivoted after validating limited willingness to pay, the platform demonstrates how fast, clean architecture can turn complex, compliance-heavy data problems into scalable solutions.

**"It’s Plaid for ESG data—connect, normalize, and report."**
