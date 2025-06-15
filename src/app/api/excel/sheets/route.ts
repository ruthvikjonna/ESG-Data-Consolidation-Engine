import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/excel/sheets?fileId=... - List worksheets in an Excel file
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ms_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Microsoft' }, { status: 401 });
    }
    // List worksheets in the Excel file
    const sheetsRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (sheetsRes.status === 401 || sheetsRes.status === 403) {
      // Clear cookies if token is invalid/expired
      const response = NextResponse.json({ error: 'Microsoft token invalid or expired' }, { status: 401 });
      response.cookies.set('ms_access_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('ms_refresh_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('ms_token_expires', '', { maxAge: 0, path: '/' });
      return response;
    }
    if (!sheetsRes.ok) throw new Error('Failed to fetch sheets');
    const sheetsData = await sheetsRes.json();
    const sheets = (sheetsData.value || []).map((s: any) => ({ id: s.id, name: s.name }));
    return NextResponse.json({ sheets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 