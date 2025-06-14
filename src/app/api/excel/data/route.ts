import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/excel/data?fileId=...&sheetName=... - Fetch data from a worksheet
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const sheetName = searchParams.get('sheetName');
    if (!fileId || !sheetName) return NextResponse.json({ error: 'Missing fileId or sheetName' }, { status: 400 });
    const accessToken = req.cookies.get('ms_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Microsoft' }, { status: 401 });
    }
    // Fetch the used range of the worksheet
    const rangeRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets/${sheetName}/usedRange`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!rangeRes.ok) throw new Error('Failed to fetch sheet data');
    const rangeData = await rangeRes.json();
    const values = rangeData.values || [];
    return NextResponse.json({ values });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 