import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.AZURE_CLIENT_ID;
  const redirectUri = process.env.AZURE_REDIRECT_URI; // e.g., https://yourdomain.com/api/excel/callback
  
  // Use valid scope combinations for Microsoft Graph API
  // For personal accounts, we need to use specific scopes
  const scopes = [
    'offline_access',
    'Files.ReadWrite',
    'User.Read',
  ];

  // Use the common endpoint to support both personal Microsoft accounts and work/school accounts
  const authUrl =
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    new URLSearchParams({
      client_id: clientId!,
      response_type: 'code',
      redirect_uri: redirectUri!,
      response_mode: 'query',
      scope: scopes.join(' '),
      state: 'excel_oauth',
    }).toString();

  return NextResponse.redirect(authUrl);
} 