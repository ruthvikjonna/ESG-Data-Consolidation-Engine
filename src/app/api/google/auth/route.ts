import { NextRequest, NextResponse } from 'next/server';
import { createOAuthClient, getAuthorizationUrl, getTokensFromCode, saveTokens } from '@/lib/googleSheetsClient';

// In-memory token storage (for demo purposes only)
// In production, use a secure database or encrypted storage
let storedTokens: any = null;

// Handler for initiating OAuth flow and handling callbacks
export async function GET(request: NextRequest) {
  try {
    // Check if this is a callback with an authorization code
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (code) {
      // This is a callback with an authorization code
      console.log('Received authorization code');
      
      // Create OAuth client
      const oauth2Client = createOAuthClient();
      
      // Exchange authorization code for tokens
      const tokens = await getTokensFromCode(oauth2Client, code);
      
      // Save tokens (in a real app, store these securely)
      saveTokens(tokens);
      
      // Store tokens in memory (for demo purposes)
      storedTokens = tokens;
      
      // Redirect to the Google Sheets page
      return NextResponse.redirect(new URL('/google-sheets?auth=success', request.url));
    } else {
      // Check if we're requesting the access token
      const requestToken = searchParams.get('requestToken') === 'true';
      
      if (requestToken && storedTokens) {
        // Return the stored access token
        return NextResponse.json({
          accessToken: storedTokens.access_token,
          expiresIn: storedTokens.expiry_date
        });
      } else {
        // Initial authorization request - generate and return auth URL
        const oauth2Client = createOAuthClient();
        const authUrl = getAuthorizationUrl(oauth2Client);
        return NextResponse.json({ authUrl });
      }
    }
  } catch (error: any) {
    console.error('Error in Google Sheets auth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed with Google Sheets authorization' },
      { status: 500 }
    );
  }
}

// Handler for OAuth callback
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { code } = data;
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }
    
    // Create OAuth client
    const oauth2Client = createOAuthClient();
    
    // Exchange authorization code for tokens
    const tokens = await getTokensFromCode(oauth2Client, code);
    
    // Save tokens (in a real app, store these securely)
    saveTokens(tokens);
    
    return NextResponse.json({ 
      success: true,
      tokens // In production, you might not want to send tokens back to client
    });
  } catch (error: any) {
    console.error('Error handling Google Sheets callback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete Google Sheets authorization' },
      { status: 500 }
    );
  }
}
