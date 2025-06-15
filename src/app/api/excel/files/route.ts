import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/excel/files - List Excel files in OneDrive (both personal and business)
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ms_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Microsoft' }, { status: 401 });
    }
    
    // First, try to get user information to determine account type
    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (userRes.status === 401 || userRes.status === 403) {
      // Clear cookies if token is invalid/expired
      const response = NextResponse.json({ error: 'Microsoft token invalid or expired' }, { status: 401 });
      response.cookies.set('ms_access_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('ms_refresh_token', '', { maxAge: 0, path: '/' });
      response.cookies.set('ms_token_expires', '', { maxAge: 0, path: '/' });
      return response;
    }
    
    if (!userRes.ok) throw new Error('Failed to fetch user information');
    
    // Try multiple approaches to find Excel files
    let allExcelFiles: any[] = [];
    
    // Approach 1: Try searching across the drive (works for most accounts)
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
      // Continue to next approach
    }
    
    // Approach 2: Try listing all files in root and check for Excel files
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
        // Continue to next approach
      }
    }
    
    // Approach 3: Try listing recent files (works well for personal accounts)
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
    
    // Deduplicate files based on ID
    const uniqueFiles = Array.from(
      new Map(allExcelFiles.map(file => [file.id, file])).values()
    );
    
    // Return the Excel files with additional path information for better identification
    return NextResponse.json({
      files: uniqueFiles.map((f: any) => ({
        id: f.id,
        name: f.name,
        path: f.parentReference?.path ? `${f.parentReference.path.replace('/drive/root:', '')}/${f.name}` : f.name
      }))
    });
  } catch (err: any) {
    console.error('Excel files API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 