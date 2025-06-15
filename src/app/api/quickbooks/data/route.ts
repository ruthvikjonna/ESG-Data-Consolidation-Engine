import { NextRequest, NextResponse } from 'next/server';

/**
 * Direct QuickBooks API implementation
 * Fetches data directly from QuickBooks API rather than using the SDK
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dataType = url.searchParams.get('type') || 'invoices';
    const isConnectionTest = req.headers.get('X-Connection-Test') === 'true';
    
    // Extract tokens and realmId from cookies
    const accessToken = req.cookies.get('qb_access_token')?.value;
    const refreshToken = req.cookies.get('qb_refresh_token')?.value;
    const realmId = req.cookies.get('qb_realm_id')?.value;
    const isConnected = req.cookies.get('qb_connected')?.value === 'true';
    
    // Log all parameters for debugging
    console.log('Data API call params:', { dataType, isConnected, hasAccessToken: !!accessToken, hasRealmId: !!realmId, isConnectionTest });
    
    // Validate required tokens
    if (!isConnected || !accessToken || !realmId) {
      return NextResponse.json(
        { error: 'Authentication required. Please connect your QuickBooks account first.' },
        { status: 401 }
      );
    }
    
    // If this is just a connection test, return success immediately
    if (isConnectionTest && req.method === 'HEAD') {
      return new NextResponse(null, { status: 200 });
    }

    // Determine API entity and query based on dataType
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

    // Execute the query against QuickBooks API
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
    
  } catch (error: any) {
    console.error('QuickBooks Data Fetch Error:', error);
    return NextResponse.json(
      { error: `Failed to fetch QuickBooks data: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Execute a query against the QuickBooks API.
 *
 * @param accessToken OAuth access token
 * @param realmId QuickBooks company ID
 * @param query SQL-like query string
 * @returns Query results if successful, null otherwise
 */
async function executeQuickBooksQuery(accessToken: string, realmId: string, query: string) {
  // Determine if we're in sandbox or production
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

/**
 * Fetch company information from QuickBooks
 * 
 * @param accessToken OAuth access token
 * @param realmId QuickBooks company ID
 * @returns Company information
 */
async function fetchCompanyInfo(accessToken: string, realmId: string) {
  // Determine if we're in sandbox or production
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
