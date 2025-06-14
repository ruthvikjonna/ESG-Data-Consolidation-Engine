import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/quickbooksClient';

export async function GET(req: NextRequest) {
  try {
    // Generate the authorization URL
    const authUrl = getAuthorizationUrl();
    
    // Redirect the user to QuickBooks authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('QuickBooks Auth Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
