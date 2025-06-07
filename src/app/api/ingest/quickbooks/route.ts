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
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

    // 1. Insert raw data into quickbooks_raw_data
    const rawResults = rows.map((row) => ({
      user_id: userId,
      source_system: 'QuickBooks',
      raw_data: row,
      pull_time: new Date().toISOString(),
    }));
    const { error: rawInsertError } = await supabase
      .from('quickbooks_raw_data')
      .insert(rawResults);
    if (rawInsertError) throw new Error(rawInsertError.message);

    // 2. Normalize and insert into quickbooks_normalized_data
    const normalizedRows = rows.map((row) => ({
      expense_id: row['No.'] || null,
      date: row['Date'] || null,
      amount: row['Total'] || null,
      category: row['Category'] || null,
      vendor: row['Payee'] || null,
      description: row['Type'] || null,
      user_id: userId,
      source_system: 'QuickBooks',
      original_data: row,
      normalized_at: new Date().toISOString(),
    }));
    const { error: normInsertError } = await supabaseAdmin
      .from('quickbooks_normalized_data')
      .insert(normalizedRows);
    if (normInsertError) throw new Error(normInsertError.message);

    return NextResponse.json({ message: 'QuickBooks data ingested and normalized', rows: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 