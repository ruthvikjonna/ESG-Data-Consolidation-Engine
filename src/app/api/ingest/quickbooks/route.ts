import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
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

    // Read the XLSX file
    const filePath = path.join(process.cwd(), 'data', 'quickbooks-expenses-sample.xlsx');
    const fileBuffer = await fs.readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const results = rows.map((row: any) => ({
      user_id: userId,
      source_system: 'QuickBooks',
      raw_data: row,
      pull_time: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('quickbooks_raw_data')
      .insert(results);
    if (error) throw new Error(error.message);

    // Optionally, trigger normalization here (like SAP/Workday)
    // ...

    return NextResponse.json({ message: 'QuickBooks data ingested', rows: results.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 