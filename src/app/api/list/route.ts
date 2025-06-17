import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createOAuthClient, listSpreadsheets } from '@/lib/googleSheetsClient';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const service = searchParams.get('service');
  
  if (!service) {
    return NextResponse.json(
      { error: 'Service parameter is required' },
      { status: 400 }
    );
  }

  if (service === 'excel') {
    return handleExcelList(req);
  } else if (service === 'google') {
    return handleGoogleList(req);
  } else {
    return NextResponse.json(
      { error: 'Invalid service. Must be "excel" or "google"' },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const service = searchParams.get('service');
  
  if (service === 'google') {
    return handleGoogleList(req);
  } else {
    return NextResponse.json(
      { error: 'Invalid service for POST request' },
      { status: 400 }
    );
  }
}

async function handleExcelList(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');
  const type = searchParams.get('type');
  
  const accessToken = req.cookies.get('ms_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'No access token found' },
      { status: 401 }
    );
  }

  if (fileId && type === 'sheets') {
    return handleExcelSheets(accessToken, fileId);
  }

  let allExcelFiles: any[] = [];
  
  // Approach 1: Search for Excel files
  try {
    const searchRes = await fetch("https://graph.microsoft.com/v1.0/me/drive/search(q='.xlsx OR .xls')", {
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
    console.log(`Fetching sheets for file ID: ${fileId}`);
    
    // Get file info including download URL
    const fileInfoRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!fileInfoRes.ok) {
      console.error('File info fetch failed:', fileInfoRes.status, fileInfoRes.statusText);
      if (fileInfoRes.status === 401 || fileInfoRes.status === 403) {
        const response = NextResponse.json({ error: 'Microsoft token invalid or expired' }, { status: 401 });
        response.cookies.set('ms_access_token', '', { maxAge: 0, path: '/' });
        response.cookies.set('ms_refresh_token', '', { maxAge: 0, path: '/' });
        response.cookies.set('ms_token_expires', '', { maxAge: 0, path: '/' });
        return response;
      }
      throw new Error(`Failed to access file: ${fileInfoRes.status} ${fileInfoRes.statusText}`);
    }
    
    const fileInfo = await fileInfoRes.json();
    console.log('File found:', fileInfo.name, 'Size:', fileInfo.size);
    
    // Download the Excel file directly using the download URL
    const downloadUrl = fileInfo['@microsoft.graph.downloadUrl'];
    if (!downloadUrl) {
      throw new Error('No download URL available for this file');
    }
    
    console.log('Downloading Excel file for parsing...');
    const fileRes = await fetch(downloadUrl);
    
    if (!fileRes.ok) {
      throw new Error(`Failed to download file: ${fileRes.status} ${fileRes.statusText}`);
    }
    
    // Convert to array buffer for XLSX parsing
    const arrayBuffer = await fileRes.arrayBuffer();
    
    // Parse with XLSX library
    console.log('Parsing Excel file with XLSX library...');
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Extract sheet names
    const sheets = workbook.SheetNames.map((name, index) => ({
      id: `sheet_${index}`,
      name: name
    }));
    
    console.log('Successfully parsed Excel file. Found sheets:', sheets.map(s => s.name));
    
    return NextResponse.json({ sheets });
    
  } catch (error) {
    console.error('Error fetching Excel sheets:', error);
    
    // Return error response
    return NextResponse.json(
      { error: `Failed to fetch Excel sheets: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 