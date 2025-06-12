import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parse } from 'csv-parse/sync'; // (or use xlsx, etc.)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const user_id = formData.get('user_id') as string;
    const source_system = formData.get('source_system') as string;

    if (!file || !user_id || !source_system) {
      throw new Error("Missing required fields (file, user_id, source_system).");
    }

    // (Optional) Parse file (e.g., CSV) into rows. (Adjust parsing logic as needed.)
    const fileText = await file.text();
    const rows = parse(fileText, { columns: true, skip_empty_lines: true });

    // Insert raw data into raw_data table.
    const rawRows = rows.map((row: Record<string, any>) => ({
      user_id,
      source_system,
      raw_data: row,
      ingested_at: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin.from('raw_data').insert(rawRows);
    if (error) throw new Error(error.message);

    return NextResponse.json({ message: "Ingest complete", count: rawRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}