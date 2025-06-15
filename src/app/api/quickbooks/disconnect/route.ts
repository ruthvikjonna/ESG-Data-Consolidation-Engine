import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Create a response that clears all QuickBooks cookies
    const response = NextResponse.json({ success: true, message: 'QuickBooks disconnected successfully' });
    
    // Clear all QuickBooks related cookies
    response.cookies.set('qb_connected', '', { 
      maxAge: 0,
      path: '/',
    });
    
    response.cookies.set('qb_access_token', '', { 
      maxAge: 0,
      path: '/',
    });
    
    response.cookies.set('qb_refresh_token', '', { 
      maxAge: 0,
      path: '/',
    });
    
    response.cookies.set('qb_realm_id', '', { 
      maxAge: 0,
      path: '/',
    });
    
    console.log('QuickBooks disconnected, cookies cleared');
    return response;
  } catch (error: any) {
    console.error('QuickBooks Disconnect Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect from QuickBooks' },
      { status: 500 }
    );
  }
}
