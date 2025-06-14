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

// GET /api/excel/files - List Excel files in OneDrive Business
export async function GET(req: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    // For MVP, use a fixed userPrincipalName or the first user in the directory
    // (In production, you may want to map this to the current admin user)
    const usersRes = await fetch('https://graph.microsoft.com/v1.0/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const usersData = await usersRes.json();
    const user = usersData.value?.[0];
    if (!user) throw new Error('No users found in directory');

    // List files in the root of the user's OneDrive
    const filesRes = await fetch(`https://graph.microsoft.com/v1.0/users/${user.id}/drive/root/children`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const filesData = await filesRes.json();
    // Filter for Excel files only
    const excelFiles = (filesData.value || []).filter((f: any) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    return NextResponse.json({ files: excelFiles.map((f: any) => ({ id: f.id, name: f.name })) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 