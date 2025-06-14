import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Handler for saving Google Sheets data to the database
export async function POST(request: NextRequest) {
  try {
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

    // Insert data into the database - using the same table as manual-upload
    const { error } = await supabase.from("ingested_data").insert(
      dataRows.map((row: any) => ({
        // Omitting user_id since we don't have authentication in this endpoint
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
