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

// GET /api/excel/sheets?fileId=... - List worksheets in an Excel file
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });

    const accessToken = await getAccessToken();
    // For MVP, use the first user in the directory
    const usersRes = await fetch('https://graph.microsoft.com/v1.0/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const usersData = await usersRes.json();
    const user = usersData.value?.[0];
    if (!user) throw new Error('No users found in directory');

    // List worksheets in the Excel file
    const sheetsRes = await fetch(`https://graph.microsoft.com/v1.0/users/${user.id}/drive/items/${fileId}/workbook/worksheets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const sheetsData = await sheetsRes.json();
    const sheets = (sheetsData.value || []).map((s: any) => ({ id: s.id, name: s.name }));
    return NextResponse.json({ sheets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 