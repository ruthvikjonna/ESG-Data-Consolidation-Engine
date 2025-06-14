import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/excel/files - List Excel files in OneDrive Business
export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('ms_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Microsoft' }, { status: 401 });
    }
    // Get current user's drive
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) throw new Error('Failed to fetch files from OneDrive');
    const filesData = await meRes.json();
    // Filter for Excel files only
    const excelFiles = (filesData.value || []).filter((f: any) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    return NextResponse.json({ files: excelFiles.map((f: any) => ({ id: f.id, name: f.name })) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 