import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');
    
    switch (service) {
      case 'excel':
        return handleExcelData(req);
      case 'quickbooks':
        return handleQuickBooksData(req);
      case 'google':
        return handleGoogleData(req);
      default:
        return NextResponse.json(
          { error: 'Service parameter required. Use: excel, quickbooks, or google' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Data fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

async function handleExcelData(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');
  const sheetName = searchParams.get('sheetName');
  
  if (!fileId || !sheetName) {
    return NextResponse.json({ error: 'Missing fileId or sheetName' }, { status: 400 });
  }
  
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('ms_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Microsoft' }, { status: 401 });
  }
  
  const rangeRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets/${sheetName}/usedRange`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (rangeRes.status === 401 || rangeRes.status === 403) {
    const response = NextResponse.json({ error: 'Microsoft token invalid or expired' }, { status: 401 });
    response.cookies.set('ms_access_token', '', { maxAge: 0, path: '/' });
    response.cookies.set('ms_refresh_token', '', { maxAge: 0, path: '/' });
    response.cookies.set('ms_token_expires', '', { maxAge: 0, path: '/' });
    return response;
  }
  
  if (!rangeRes.ok) throw new Error('Failed to fetch sheet data');
  
  const rangeData = await rangeRes.json();
  const values = rangeData.values || [];
  
  return NextResponse.json({ values });
}

async function handleQuickBooksData(req: NextRequest) {
  const url = new URL(req.url);
  const dataType = url.searchParams.get('type') || 'invoices';
  const isConnectionTest = req.headers.get('X-Connection-Test') === 'true';
  
  const accessToken = req.cookies.get('qb_access_token')?.value;
  const refreshToken = req.cookies.get('qb_refresh_token')?.value;
  const realmId = req.cookies.get('qb_realm_id')?.value;
  const isConnected = req.cookies.get('qb_connected')?.value === 'true';
  
  console.log('Data API call params:', { dataType, isConnected, hasAccessToken: !!accessToken, hasRealmId: !!realmId, isConnectionTest });
  
  if (!isConnected || !accessToken || !realmId) {
    return NextResponse.json(
      { error: 'Authentication required. Please connect your QuickBooks account first.' },
      { status: 401 }
    );
  }
  
  if (isConnectionTest && req.method === 'HEAD') {
    return new NextResponse(null, { status: 200 });
  }

  let entity = '';
  let query = '';
  
  switch (dataType) {
    case 'company':
      return await fetchCompanyInfo(accessToken, realmId);
    case 'customers':
      entity = 'Customer';
      query = 'SELECT * FROM Customer';
      break;
    case 'invoices':
      entity = 'Invoice';
      query = 'SELECT * FROM Invoice';
      break;
    case 'bills':
      entity = 'Bill';
      query = 'SELECT * FROM Bill';
      break;
    case 'purchases':
      entity = 'Purchase';
      query = 'SELECT * FROM Purchase';
      break;
    case 'accounts':
      entity = 'Account';
      query = 'SELECT * FROM Account';
      break;
    default:
      return NextResponse.json(
        { error: 'Invalid data type requested' },
        { status: 400 }
      );
  }

  const results = await executeQuickBooksQuery(accessToken, realmId, query);
  
  if (!results) {
    return NextResponse.json(
      { error: `Failed to fetch ${dataType} data from QuickBooks` },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    data: results.QueryResponse,
    maxResults: results.QueryResponse.maxResults,
    startPosition: results.QueryResponse.startPosition,
    totalCount: results.QueryResponse.totalCount
  });
}

async function executeQuickBooksQuery(accessToken: string, realmId: string, query: string) {
  const isSandbox = process.env.NODE_ENV !== 'production' || process.env.QUICKBOOKS_SANDBOX === 'true';
  
  const baseUrl = isSandbox 
    ? 'https://sandbox-quickbooks.api.intuit.com' 
    : 'https://quickbooks.api.intuit.com';
    
  const url = `${baseUrl}/v3/company/${realmId}/query`;
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/text',
  };
  
  try {
    console.log(`Executing QuickBooks query: ${query}`);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: query,
    });
    
    const intuit_tid = response.headers.get('intuit_tid');
    console.log(`QuickBooks request ID (intuit_tid): ${intuit_tid}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`QuickBooks API Error: ${response.status} ${response.statusText}`);
      console.error(errorText);
      return null;
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error executing QuickBooks query:', error);
    return null;
  }
}

async function fetchCompanyInfo(accessToken: string, realmId: string) {
  const isSandbox = process.env.NODE_ENV !== 'production' || process.env.QUICKBOOKS_SANDBOX === 'true';
  
  const baseUrl = isSandbox 
    ? 'https://sandbox-quickbooks.api.intuit.com' 
    : 'https://quickbooks.api.intuit.com';
    
  const url = `${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`QuickBooks API Error: ${response.status} ${response.statusText}`);
      console.error(errorText);
      return NextResponse.json(
        { error: 'Failed to fetch company information from QuickBooks' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({ data: data });
    
  } catch (error: any) {
    console.error('Error fetching company info:', error);
    return NextResponse.json(
      { error: `Failed to fetch company info: ${error.message}` },
      { status: 500 }
    );
  }
}

async function handleGoogleData(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accessToken = searchParams.get('access_token');
  const spreadsheetId = searchParams.get('spreadsheet_id');
  const range = searchParams.get('range') || 'Sheet1'; // Default to Sheet1 if not provided

  if (!accessToken || !spreadsheetId) {
    return NextResponse.json({ error: 'Missing access_token or spreadsheet_id' }, { status: 400 });
  }

  try {
    // Fetch the first 100 rows and 20 columns for preview
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Google Sheets API error: ${errorText}` }, { status: res.status });
    }

    const data = await res.json();
    const values = data.values || [];

    return NextResponse.json({ values });
  } catch (error: any) {
    console.error('Error fetching Google Sheets data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Google Sheets data' },
      { status: 500 }
    );
  }
} 