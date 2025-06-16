import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');
    
    switch (service) {
      case 'quickbooks':
        return handleQuickBooksDisconnect();
      case 'excel':
        return handleExcelDisconnect();
      case 'google':
        return handleGoogleDisconnect();
      case 'all':
        return handleAllDisconnect();
      default:
        return NextResponse.json(
          { error: 'Service parameter required. Use: quickbooks, excel, google, or all' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Disconnect Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

function handleQuickBooksDisconnect() {
  const response = NextResponse.json({ 
    success: true, 
    message: 'QuickBooks disconnected successfully' 
  });
  
  response.cookies.set('qb_connected', '', { maxAge: 0, path: '/' });
  response.cookies.set('qb_access_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('qb_refresh_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('qb_realm_id', '', { maxAge: 0, path: '/' });
  
  console.log('QuickBooks disconnected, cookies cleared');
  return response;
}

function handleExcelDisconnect() {
  const response = NextResponse.json({ 
    success: true, 
    message: 'Excel/Microsoft disconnected successfully' 
  });
  
  response.cookies.set('ms_access_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('ms_refresh_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('ms_token_expires', '', { maxAge: 0, path: '/' });
  
  console.log('Excel/Microsoft disconnected, cookies cleared');
  return response;
}

function handleGoogleDisconnect() {
  // Google tokens are typically handled in memory or client-side
  // For a more robust implementation, you'd clear any server-side stored tokens
  const response = NextResponse.json({ 
    success: true, 
    message: 'Google Sheets disconnected successfully' 
  });
  
  console.log('Google Sheets disconnected');
  return response;
}

function handleAllDisconnect() {
  const response = NextResponse.json({ 
    success: true, 
    message: 'All services disconnected successfully' 
  });
  
  // Clear all service cookies
  response.cookies.set('qb_connected', '', { maxAge: 0, path: '/' });
  response.cookies.set('qb_access_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('qb_refresh_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('qb_realm_id', '', { maxAge: 0, path: '/' });
  
  response.cookies.set('ms_access_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('ms_refresh_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('ms_token_expires', '', { maxAge: 0, path: '/' });
  
  console.log('All services disconnected, cookies cleared');
  return response;
} 