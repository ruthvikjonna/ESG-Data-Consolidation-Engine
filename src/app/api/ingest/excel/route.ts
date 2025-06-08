import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('authorization') || '',
          },
        },
      }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');
    const userId = user.id;

    // Read the XLSX file (excel-vendoremissions-sample.xlsx)
    const filePath = path.join(process.cwd(), 'data', 'excel-vendoremissions-sample.xlsx');
    const fileBuffer = await fs.readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

    // Insert raw data into excel_raw_data
    const rawResults = rows.map((row) => ({
      user_id: userId,
      source_system: 'excel',
      raw_data: row,
      pull_time: new Date().toISOString(),
    }));
    const { error: rawInsertError } = await supabase
      .from('excel_raw_data')
      .insert(rawResults);
    if (rawInsertError) throw new Error(rawInsertError.message);

    return NextResponse.json({ message: 'Excel data ingested', rows: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 