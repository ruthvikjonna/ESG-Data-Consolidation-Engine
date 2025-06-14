import { NextRequest, NextResponse } from 'next/server';

// Helper to get an access token from Microsoft Graph
async function getAccessToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId!,
      client_secret: clientSecret!,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get access token');
  return tokenData.access_token;
}

// GET /api/excel/data?fileId=...&sheetName=... - Fetch data from a worksheet
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const sheetName = searchParams.get('sheetName');
    if (!fileId || !sheetName) return NextResponse.json({ error: 'Missing fileId or sheetName' }, { status: 400 });

    const accessToken = await getAccessToken();
    // For MVP, use the first user in the directory
    const usersRes = await fetch('https://graph.microsoft.com/v1.0/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const usersData = await usersRes.json();
    const user = usersData.value?.[0];
    if (!user) throw new Error('No users found in directory');

    // Fetch the used range of the worksheet
    const rangeRes = await fetch(`https://graph.microsoft.com/v1.0/users/${user.id}/drive/items/${fileId}/workbook/worksheets/${sheetName}/usedRange`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const rangeData = await rangeRes.json();
    const values = rangeData.values || [];
    return NextResponse.json({ values });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 