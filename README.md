# Bloom Technologies - ESG Data Infrastructure Platform MVP

> **A comprehensive ESG data integration platform built in 17 days** | *Pivoted after validating market demand through 24+ customer interviews*

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
- **Decision to pivot**: After 2.5 weeks of development, moved to a different sustainability-focused opportunity

## Technical Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Integrations**: 
  - Microsoft Graph API (Excel/OneDrive)
  - Google Sheets API
  - QuickBooks API
  - File upload processing (CSV, Excel, JSON)

### Key Features

#### Unified Authentication System
- Single sign-on across all integrations
- Secure token management with automatic refresh
- Service-specific authentication flows

#### Multi-Source Data Integration
- **Excel/OneDrive**: Direct integration with Microsoft Graph API
- **Google Sheets**: Real-time data fetching via Google Sheets API
- **QuickBooks**: Financial data extraction (invoices, bills, customers, accounts)
- **Manual Upload**: Support for CSV, Excel, and JSON files

#### Consolidated API Architecture
Six main API endpoints handle all integration scenarios:
- `/api/auth` - OAuth flows for all services
- `/api/callback` - OAuth callback handling
- `/api/data` - Data fetching from connected services
- `/api/save` - Data persistence and storage
- `/api/list` - Resource listing (files, sheets, etc.)
- `/api/disconnect` - Service disconnection

#### Data Processing & Validation
- Automatic data type detection and conversion
- CSV/Excel parsing with error handling
- Data structure validation and cleaning
- Real-time preview and transformation

## Project Structure

```
src/
├── app/
│   ├── api/                    # Consolidated API routes
│   │   ├── auth/              # OAuth authentication
│   │   ├── callback/          # OAuth callbacks
│   │   ├── data/              # Data fetching
│   │   ├── save/              # Data persistence
│   │   ├── list/              # Resource listing
│   │   └── disconnect/        # Service disconnection
│   ├── dashboard/             # Main dashboard
│   ├── integrations/          # Integration management
│   └── auth/                  # Authentication pages
├── lib/                       # Service clients and utilities
│   ├── googleSheetsClient.ts
│   ├── quickbooksClient.ts
│   ├── supabase.ts
│   └── utils.ts
└── types/                     # TypeScript definitions
```

## Technical Highlights

### Advanced Integration Patterns
```typescript
// Unified service configuration
const SERVICE_CONFIGS: Record<Service, ServiceConfig> = {
  excel: { name: 'Microsoft Excel', authRequired: true },
  google: { name: 'Google Sheets', authRequired: true },
  quickbooks: { 
    name: 'QuickBooks', 
    authRequired: true,
    dataTypes: ['company', 'customers', 'invoices', 'bills', 'purchases', 'accounts']
  },
  manual: { name: 'Manual Upload', authRequired: false }
};
```

### Robust Error Handling
- Graceful degradation for API failures
- Automatic token refresh mechanisms
- Comprehensive logging and debugging
- User-friendly error messages

### Performance Optimizations
- Efficient data streaming for large files
- Optimized API response caching
- Minimal bundle size with tree shaking
- Responsive UI with loading states

## Key Learnings

### Technical Insights
- **API Design**: Consolidated endpoints reduce complexity and improve maintainability
- **Error Handling**: Comprehensive error handling is crucial for enterprise integrations
- **Performance**: Streaming and caching strategies essential for large datasets
- **Security**: Proper token management and OAuth flows critical for enterprise use

### Product Insights
- **Market Validation**: Customer interviews revealed real pain points but limited willingness to pay
- **Rapid Iteration**: Building multiple MVPs quickly helps validate assumptions
- **Technical Debt**: Clean architecture from the start enables faster iteration
- **User Experience**: Seamless integrations require careful attention to edge cases

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Microsoft Azure AD app
- Google Cloud project
- QuickBooks developer account

### Installation
```bash
git clone <repository>
cd esg-mvp
npm install
```

### Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Configure your environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
MICROSOFT_CLIENT_ID=your_azure_app_id
GOOGLE_CLIENT_ID=your_google_client_id
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
```

### Development
```bash
npm run dev
```
