import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/excel/files - List Excel files in OneDrive Business
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ms_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Microsoft' }, { status: 401 });
    }
    // Get current user's drive
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (meRes.status === 401 || meRes.status === 403) {
      // Clear cookies if token is invalid/expired
      const response = NextResponse.json({ error: 'Microsoft token invalid or expired' }, { status: 401 });
      response.cookies.set('ms_access_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('ms_refresh_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('ms_token_expires', '', { maxAge: 0, path: '/' });
      return response;
    }
    if (!meRes.ok) throw new Error('Failed to fetch files from OneDrive');
    const filesData = await meRes.json();
    // Filter for Excel files only
    const excelFiles = (filesData.value || []).filter((f: any) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    return NextResponse.json({ files: excelFiles.map((f: any) => ({ id: f.id, name: f.name })) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 