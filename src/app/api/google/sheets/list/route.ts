import { NextRequest, NextResponse } from 'next/server';
import { createOAuthClient, listSpreadsheets } from '@/lib/googleSheetsClient';

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }
    
    // Create OAuth client and set credentials
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    // Get list of spreadsheets
    const spreadsheets = await listSpreadsheets(oauth2Client);
    
    return NextResponse.json({ spreadsheets });
  } catch (error: any) {
    console.error('Error listing spreadsheets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list spreadsheets' },
      { status: 500 }
    );
  }
}
