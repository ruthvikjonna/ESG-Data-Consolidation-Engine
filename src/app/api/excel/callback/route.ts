import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl = envBaseUrl || req.nextUrl.origin;
  if (!baseUrl) throw new Error('Missing base URL for redirect');
  if (error) {
    return NextResponse.redirect(`${baseUrl}/excel-import?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${baseUrl}/excel-import?error=Missing+authorization+code`);
  }

  const tenant = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const redirectUri = process.env.AZURE_REDIRECT_URI;

  // Exchange code for tokens
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
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
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${baseUrl}/excel-import?error=Failed+to+get+access+token`);
  }

  // Store tokens in a secure cookie (for demo; in production, use a DB)
  const response = NextResponse.redirect(`${baseUrl}/excel-import`);
  response.cookies.set('ms_access_token', tokenData.access_token, { httpOnly: true, secure: true, path: '/' });
  if (tokenData.refresh_token) {
    response.cookies.set('ms_refresh_token', tokenData.refresh_token, { httpOnly: true, secure: true, path: '/' });
  }
  response.cookies.set('ms_token_expires', `${Date.now() + (tokenData.expires_in || 3600) * 1000}`, { httpOnly: true, secure: true, path: '/' });

  return response;
} 