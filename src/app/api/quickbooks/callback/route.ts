import { NextRequest, NextResponse } from 'next/server';
import { oauthClient, saveTokens } from '@/lib/quickbooksClient';

export async function GET(req: NextRequest) {
  console.log('QuickBooks Callback: Received request');
  try {
    // Get the URL with query parameters
    const url = req.url;
    const urlObj = new URL(url);
    
    // In QuickBooks OAuth2 flow, realmId is passed as a separate parameter in the callback
    let realmId = urlObj.searchParams.get('realmId');
    
    // Log all URL parameters for debugging
    console.log('All URL parameters:', Object.fromEntries(urlObj.searchParams.entries()));
    
    // Exchange the authorization code for tokens
    const authResponse = await oauthClient.createToken(url);
    const token = authResponse.getJson();
    
    // Store the tokens securely
    saveTokens(token);
    
    // Debug output to see the token structure
    console.log('QuickBooks token received:', JSON.stringify(token));
    
    // In OAuth2 flow, the realmId is often included in the token response
    if (!realmId && token.realmId) {
      realmId = token.realmId;
    }
    
    // The realmId might also be in the URL as 'state' or other fields in QuickBooks OAuth2 flow
    if (!realmId) {
      // Check all potential places where realmId could be
      const state = urlObj.searchParams.get('state');
      if (state && state !== 'testState') {
        realmId = state; // Some implementations use state to pass realmId
      }
    }
    
    // In some versions of the QuickBooks API, it's provided in a different format
    // Try to extract from all possible keys in the token
    if (!realmId) {
      for (const key of Object.keys(token)) {
        if (key.toLowerCase().includes('realm') && token[key]) {
          realmId = token[key];
          break;
        }
      }
    }
    
    console.log('Final realmId determined:', realmId);
    
    // In a real application, you would store these tokens securely in a database
    // For this demo, we'll store them in the browser's session storage
    // Create a cookie to indicate QuickBooks is connected and redirect to the QuickBooks page
    const response = NextResponse.redirect(new URL('/quickbooks', req.url));
    
    // Store QuickBooks connection details in cookies
    // Note: In production, these should be stored in a database
    if (realmId) {
      // Store connection status and tokens
      response.cookies.set('qb_connected', 'true', { 
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day
      });
      
      response.cookies.set('qb_access_token', token.access_token, { 
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
      });
      
      response.cookies.set('qb_refresh_token', token.refresh_token, { 
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      
      response.cookies.set('qb_realm_id', realmId, { 
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      
      console.log('QuickBooks tokens stored in cookies, redirecting to /quickbooks');
      return response;
    } else {
      // If we still don't have a realmId, we can't proceed
      console.error('No realmId found in any source');
      return NextResponse.json(
        { error: 'Failed to get realmId from QuickBooks. Please check the console logs.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('QuickBooks Callback Error:', error);
    return NextResponse.json(
      { error: 'Failed to process QuickBooks callback' },
      { status: 500 }
    );
  }
}
