import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

async function parseFile(file: File): Promise<any[]> {
  const fileType = file.name.split('.').pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  switch (fileType) {
    case 'csv':
      return parse(buffer.toString(), { 
        columns: true, 
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true // More forgiving with quotes
      });

    case 'xlsx':
    case 'xls':
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(firstSheet);

    case 'json':
      const text = buffer.toString();
      const json = JSON.parse(text);
      // Handle both array and { data: [...] } formats
      return Array.isArray(json) ? json : json.data || [json];

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const user_id = formData.get('user_id') as string;
    const source_system = formData.get('source_system') as string;

    if (!file || !user_id || !source_system) {
      throw new Error("Missing required fields (file, user_id, source_system).");
    }

    // Parse file based on type
    const rows = await parseFile(file);
    
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("No valid data found in file.");
    }

    // Insert raw data into raw_data table
    const rawRows = rows.map((row: Record<string, any>) => ({
      user_id,
      source_system,
      raw_data: row,
      ingested_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from('raw_data').insert(rawRows);
    if (error) throw new Error(error.message);

    return NextResponse.json({ 
      message: "Ingest complete", 
      count: rawRows.length,
      fileType: file.name.split('.').pop()?.toLowerCase()
    });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return NextResponse.json({ 
      error: err.message,
      details: err.stack // Remove in production
    }, { status: 500 });
  }
}