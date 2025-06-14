import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

// Parses the uploaded file into a uniform array of row objects
async function parseFile(file: File): Promise<any[]> {
  const fileType = file.name.split('.').pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  switch (fileType) {
    case 'csv':
      return parse(buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      });

    case 'xlsx':
    case 'xls':
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(firstSheet);

    case 'json':
      const text = buffer.toString();
      const json = JSON.parse(text);
      return Array.isArray(json) ? json : json.data || [json];

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// HTTP POST handler for uploading and storing raw data files
export async function POST(req: NextRequest) {
  try {
    // Extract uploaded file and metadata from the form submission
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const user_id = formData.get('user_id') as string;
    const source_system = formData.get('source_system') as string;

    // Validate presence of all required fields
    if (!file || !user_id || !source_system) {
      throw new Error("Missing required fields (file, user_id, source_system).");
    }

    // Parse uploaded file into structured data
    const rows = await parseFile(file);

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("No valid data found in file.");
    }

    // Prepare rows for database insertion, including metadata
    const rawRows = rows.map((row: Record<string, any>) => ({
      user_id,
      source_system,
      raw_data: row,
      ingested_at: new Date().toISOString(),
    }));

    // Insert parsed data into Supabase 'raw_data' table
    const { error } = await supabaseAdmin.from('raw_data').insert(rawRows);
    if (error) throw new Error(error.message);

    // Return success response with count and file type info
    return NextResponse.json({
      message: "Ingest complete",
      count: rawRows.length,
      fileType: file.name.split('.').pop()?.toLowerCase(),
    });
  } catch (err: any) {
    console.error('Ingest error:', err);

    // Return error details for debugging (stack should be removed in production)
    return NextResponse.json({
      error: err.message,
      details: err.stack,
    }, { status: 500 });
  }
}
