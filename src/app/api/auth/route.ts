import { NextRequest, NextResponse } from 'next/server';
import { createOAuthClient, getAuthorizationUrl } from '@/lib/googleSheetsClient';
import { getAuthorizationUrl as getQuickBooksAuthUrl } from '@/lib/quickbooksClient';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');
    
    switch (service) {
      case 'excel':
        return handleExcelAuth(req);
      case 'google':
      case 'sheets':
        return handleGoogleAuth(req);
      case 'quickbooks':
        return handleQuickBooksAuth(req);
      default:
        return NextResponse.json(
          { error: 'Service parameter required. Use: excel, google, sheets, or quickbooks' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Auth Error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

async function handleExcelAuth(req: NextRequest) {
  const clientId = process.env.AZURE_CLIENT_ID;
  const redirectUri = process.env.AZURE_REDIRECT_URI;
  const scopes = [
    'offline_access',
    'Files.ReadWrite.All',
    'User.Read',
    'Sites.ReadWrite.All'
  ];

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

  // Always return JSON for GET (fetch) requests
  return NextResponse.json({ authUrl });
}

async function handleGoogleAuth(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestToken = searchParams.get('requestToken') === 'true';
  
  if (requestToken) {
    // Try to get the access token from cookies
    const accessToken = req.cookies.get('google_access_token')?.value;
    if (accessToken) {
      return NextResponse.json({ accessToken });
    } else {
      return NextResponse.json({ error: 'No Google access token found' }, { status: 401 });
    }
  } else {
    const oauth2Client = createOAuthClient();
    const authUrl = getAuthorizationUrl(oauth2Client);
    return NextResponse.json({ authUrl });
  }
}

async function handleQuickBooksAuth(req: NextRequest) {
  const authUrl = getQuickBooksAuthUrl();
  return NextResponse.json({ authUrl });
}

// Handle POST requests for Google auth token requests
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    
    if (service === 'google') {
      const data = await request.json();
      const { code } = data;
      
      if (!code) {
        return NextResponse.json(
          { error: 'Authorization code is required' },
          { status: 400 }
        );
      }
      
      const oauth2Client = createOAuthClient();
      const { getTokensFromCode, saveTokens } = await import('@/lib/googleSheetsClient');
      const tokens = await getTokensFromCode(oauth2Client, code);
      saveTokens(tokens);
      
      return NextResponse.json({ 
        success: true,
        tokens
      });
    }
    
    return NextResponse.json(
      { error: 'Service not supported for POST requests' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error handling auth POST:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete authorization' },
      { status: 500 }
    );
  }
} 