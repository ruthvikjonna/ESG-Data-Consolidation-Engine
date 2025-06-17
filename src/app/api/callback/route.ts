import { NextRequest, NextResponse } from 'next/server';
import { oauthClient, saveTokens } from '@/lib/quickbooksClient';
import { createOAuthClient, getTokensFromCode, saveTokens as saveGoogleTokens } from '@/lib/googleSheetsClient';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state');
    const realmId = url.searchParams.get('realmId');
    const service = url.searchParams.get('service');
    
    const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const baseUrl = envBaseUrl || req.nextUrl.origin;
    
    if (error) {
      const redirectPath = getRedirectPath(state, service);
      return NextResponse.redirect(`${baseUrl}${redirectPath}?error=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      const redirectPath = getRedirectPath(state, service);
      return NextResponse.redirect(`${baseUrl}${redirectPath}?error=Missing+authorization+code`);
    }
    
    // Determine service based on state or explicit service param
    if (state === 'excel_oauth' || service === 'excel') {
      return handleExcelCallback(req, code, baseUrl);
    } else if (realmId || service === 'quickbooks') {
      return handleQuickBooksCallback(req, code, realmId, baseUrl);
    } else if (service === 'google') {
      return handleGoogleCallback(req, code, baseUrl);
    } else {
      // Try to auto-detect based on URL patterns or default to Excel
      console.log('Auto-detecting service from callback...');
      if (realmId) {
        return handleQuickBooksCallback(req, code, realmId, baseUrl);
      } else {
        return handleExcelCallback(req, code, baseUrl);
      }
    }
  } catch (error: any) {
    console.error('Callback Error:', error);
    return NextResponse.json(
      { error: error.message || 'Callback processing failed' },
      { status: 500 }
    );
  }
}

function getRedirectPath(state: string | null, service: string | null): string {
  if (state === 'excel_oauth' || service === 'excel') return '/excel-import';
  if (service === 'quickbooks') return '/quickbooks';
  if (service === 'google') return '/google-sheets';
  return '/'; // default fallback
}

async function handleExcelCallback(req: NextRequest, code: string, baseUrl: string) {
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const redirectUri = process.env.AZURE_REDIRECT_URI;

  console.log('Excel callback - attempting token exchange');
  console.log('Client ID:', clientId);
  console.log('Redirect URI:', redirectUri);
  console.log('Code length:', code?.length);

  const tokenRes = await fetch(`https://login.microsoftonline.com/common/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri!,
    }),
  });
  
  console.log('Token response status:', tokenRes.status, tokenRes.statusText);
  
  const tokenData = await tokenRes.json();
  console.log('Token response data:', JSON.stringify(tokenData, null, 2));
  
  if (!tokenData.access_token) {
    console.error('No access token received:', tokenData);
    return NextResponse.redirect(`${baseUrl}/excel-import?error=Failed+to+get+access+token`);
  }

  const response = NextResponse.redirect(`${baseUrl}/excel-import`);
  response.cookies.set('ms_access_token', tokenData.access_token, { httpOnly: true, secure: true, path: '/' });
  if (tokenData.refresh_token) {
    response.cookies.set('ms_refresh_token', tokenData.refresh_token, { httpOnly: true, secure: true, path: '/' });
  }
  response.cookies.set('ms_token_expires', `${Date.now() + (tokenData.expires_in || 3600) * 1000}`, { httpOnly: true, secure: true, path: '/' });

  return response;
}

async function handleQuickBooksCallback(req: NextRequest, code: string, realmId: string | null, baseUrl: string) {
  const url = req.url;
  const urlObj = new URL(url);
  
  if (!realmId) {
    realmId = urlObj.searchParams.get('realmId');
  }
  
  console.log('QuickBooks Callback: Processing request');
  console.log('All URL parameters:', Object.fromEntries(urlObj.searchParams.entries()));
  
  const authResponse = await oauthClient.createToken(url);
  const token = authResponse.getJson();
  
  saveTokens(token);
  console.log('QuickBooks token received:', JSON.stringify(token));
  
  if (!realmId && token.realmId) {
    realmId = token.realmId;
  }
  
  if (!realmId) {
    const state = urlObj.searchParams.get('state');
    if (state && state !== 'testState') {
      realmId = state;
    }
  }
  
  if (!realmId) {
    for (const key of Object.keys(token)) {
      if (key.toLowerCase().includes('realm') && token[key]) {
        realmId = token[key];
        break;
      }
    }
  }
  
  console.log('Final realmId determined:', realmId);
  
  const response = NextResponse.redirect(new URL('/quickbooks', req.url));
  
  if (realmId) {
    response.cookies.set('qb_connected', 'true', { 
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });
    
    response.cookies.set('qb_access_token', token.access_token, { 
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60,
    });
    
    response.cookies.set('qb_refresh_token', token.refresh_token, { 
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
    
    response.cookies.set('qb_realm_id', realmId, { 
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
    
    console.log('QuickBooks tokens stored in cookies, redirecting to /quickbooks');
    return response;
  } else {
    console.error('No realmId found in any source');
    return NextResponse.json(
      { error: 'Failed to get realmId from QuickBooks. Please check the console logs.' },
      { status: 500 }
    );
  }
}

async function handleGoogleCallback(req: NextRequest, code: string, baseUrl: string) {
  console.log('Received Google authorization code');
  
  const oauth2Client = createOAuthClient();
  const tokens = await getTokensFromCode(oauth2Client, code);
  saveGoogleTokens(tokens);
  
  return NextResponse.redirect(new URL('/google-sheets?auth=success', req.url));
} 