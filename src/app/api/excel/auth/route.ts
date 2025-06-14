import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const tenant = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const redirectUri = process.env.AZURE_REDIRECT_URI; // e.g., https://yourdomain.com/api/excel/callback
  const scopes = [
    'offline_access',
    'Files.Read.All',
    'User.Read',
  ];

  const authUrl =
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?` +
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