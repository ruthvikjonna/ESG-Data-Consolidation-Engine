# Google Sheets Integration for ESG Data Infrastructure Platform

This integration allows you to connect your ESG Data Infrastructure Platform with Google Sheets for reading, writing, and manipulating spreadsheet data.

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API and Google Drive API

### 2. Set Up OAuth Credentials

1. In the Google Cloud Console, navigate to APIs & Services > Credentials
2. Create OAuth 2.0 Client ID credentials
   - Set the application type as "Web application"
   - Add authorized redirect URIs (e.g., `http://localhost:3000/api/google/callback` for development)
3. Note the Client ID and Client Secret

### 3. Configure Environment Variables

Add the following variables to your `.env` or `.env.local` file:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=your-redirect-uri # e.g., http://localhost:3000/api/google/callback
```

## Usage

1. Navigate to the Google Sheets page in your application
2. Click "Authorize with Google" to connect your Google account
3. After authentication, you can:
   - Create new spreadsheets
   - Read data from existing spreadsheets
   - Update or append data
   - Clear spreadsheet ranges

## API Reference

The integration provides the following API endpoints:

### Authentication

- `GET /api/google/auth` - Get authorization URL
- `POST /api/google/auth` - Exchange authorization code for tokens

### Spreadsheet Operations

- `GET /api/google/sheets` - Read spreadsheet data
- `POST /api/google/sheets` - Create, update, append, or clear spreadsheet data

## Implementation Notes

- Token storage is currently implemented with console logging. In production, implement secure token storage (e.g., in a database) and proper refresh token handling.
- For security reasons, handle access tokens server-side in production environments.
