import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createOAuthClient, listSpreadsheets } from '@/lib/googleSheetsClient';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');
    
    switch (service) {
      case 'excel':
        return handleExcelList(req);
      case 'google':
        return NextResponse.json({ error: 'Google Sheets listing requires POST with access token' }, { status: 400 });
      default:
        return NextResponse.json(
          { error: 'Service parameter required. Use: excel or google' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('List error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list resources' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');
    
    switch (service) {
      case 'google':
        return handleGoogleList(req);
      default:
        return NextResponse.json(
          { error: 'Service parameter required. Use: google' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('List error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list resources' },
      { status: 500 }
    );
  }
}

async function handleExcelList(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');
  const type = searchParams.get('type');
  
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('ms_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Microsoft' }, { status: 401 });
  }
  
  // If requesting sheets for a specific file
  if (type === 'sheets' && fileId) {
    return handleExcelSheets(accessToken, fileId);
  }
  
  const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (userRes.status === 401 || userRes.status === 403) {
    const response = NextResponse.json({ error: 'Microsoft token invalid or expired' }, { status: 401 });
    response.cookies.set('ms_access_token', '', { maxAge: 0, path: '/' });
    response.cookies.set('ms_refresh_token', '', { maxAge: 0, path: '/' });
    response.cookies.set('ms_token_expires', '', { maxAge: 0, path: '/' });
    return response;
  }
  
  if (!userRes.ok) throw new Error('Failed to fetch user information');
  
  let allExcelFiles: any[] = [];
  
  // Approach 1: Search for Excel files
  try {
    const searchQuery = "file:(*.xlsx OR *.xls)";
    const searchRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/search(q='${searchQuery}')`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (searchRes.ok) {
      const filesData = await searchRes.json();
      const excelFiles = (filesData.value || []).filter((f: any) => 
        f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
      );
      allExcelFiles = [...allExcelFiles, ...excelFiles];
    }
  } catch (searchErr) {
    console.error('Search approach failed:', searchErr);
  }
  
  // Approach 2: List files in root
  if (allExcelFiles.length === 0) {
    try {
      const rootRes = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (rootRes.ok) {
        const rootData = await rootRes.json();
        const rootExcelFiles = (rootData.value || []).filter((f: any) => 
          f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );
        allExcelFiles = [...allExcelFiles, ...rootExcelFiles];
      }
    } catch (rootErr) {
      console.error('Root listing approach failed:', rootErr);
    }
  }
  
  // Approach 3: Recent files
  if (allExcelFiles.length === 0) {
    try {
      const recentRes = await fetch('https://graph.microsoft.com/v1.0/me/drive/recent', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        const recentExcelFiles = (recentData.value || []).filter((f: any) => 
          f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );
        allExcelFiles = [...allExcelFiles, ...recentExcelFiles];
      }
    } catch (recentErr) {
      console.error('Recent files approach failed:', recentErr);
    }
  }
  
  const uniqueFiles = Array.from(
    new Map(allExcelFiles.map(file => [file.id, file])).values()
  );
  
  return NextResponse.json({
    files: uniqueFiles.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.parentReference?.path ? `${f.parentReference.path.replace('/drive/root:', '')}/${f.name}` : f.name
    }))
  });
}

async function handleGoogleList(req: NextRequest) {
  const { accessToken } = await req.json();
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Access token is required' },
      { status: 400 }
    );
  }
  
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const spreadsheets = await listSpreadsheets(oauth2Client);
  
  return NextResponse.json({ spreadsheets });
}

async function handleExcelSheets(accessToken: string, fileId: string) {
  try {
    const sheetsRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (sheetsRes.status === 401 || sheetsRes.status === 403) {
      const response = NextResponse.json({ error: 'Microsoft token invalid or expired' }, { status: 401 });
      response.cookies.set('ms_access_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('ms_refresh_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('ms_token_expires', '', { maxAge: 0, path: '/' });
      return response;
    }
    
    if (!sheetsRes.ok) throw new Error('Failed to fetch worksheets');
    
    const sheetsData = await sheetsRes.json();
    const sheets = (sheetsData.value || []).map((sheet: any) => ({
      id: sheet.id,
      name: sheet.name
    }));
    
    return NextResponse.json({ sheets });
  } catch (error: any) {
    console.error('Error fetching Excel sheets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sheets' },
      { status: 500 }
    );
  }
} 