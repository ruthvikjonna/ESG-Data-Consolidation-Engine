import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client that can access auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side
);

// Handler for saving Google Sheets data to the database
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user with the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { sheetData, spreadsheetId, sheetName } = data;
    
    if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
      return NextResponse.json(
        { error: 'Valid sheet data is required' },
        { status: 400 }
      );
    }

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Spreadsheet ID is required' },
        { status: 400 }
      );
    }

    // Extract headers from the first row (assuming it contains headers)
    const headers = sheetData[0].map((header: string) => header.trim().toLowerCase().replace(/\s+/g, '_'));
    
    // Process the data rows (skip the header row)
    const dataRows = sheetData.slice(1).map((row: any[]) => {
      const rowData: Record<string, any> = {};
      
      // Map each cell to its corresponding header
      headers.forEach((header: string, index: number) => {
        rowData[header] = row[index] || null;
      });
      
      // Add metadata
      rowData.source = 'google_sheets';
      rowData.spreadsheet_id = spreadsheetId;
      rowData.sheet_name = sheetName || 'unknown';
      rowData.imported_at = new Date().toISOString();
      
      return rowData;
    });

    // FIXED - Include user_id from authenticated user
    const { error } = await supabase.from("ingested_data").insert(
      dataRows.map((row: any) => ({
        user_id: user.id, // Add the authenticated user's ID
        source_system: "google_sheets",
        raw_payload: row,
        ingested_at: new Date().toISOString(),
      }))
    );

    if (error) {
      console.error('Error saving data to database:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to save data to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully saved ${dataRows.length} rows to database`,
      insertedCount: dataRows.length
    });
  } catch (error: any) {
    console.error('Error processing Google Sheets data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process and save Google Sheets data' },
      { status: 500 }
    );
  }
}