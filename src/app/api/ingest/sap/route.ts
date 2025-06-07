import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function normalizeSapRecord(row: any) {
  function formatDate(yyyymmdd: string) {
    if (!yyyymmdd || yyyymmdd.length !== 8) return null;
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }
  return {
    profit_center_id: row.raw_data.PROFITCENTERID || null,
    language: row.raw_data.LANGUAGE || null,
    created_by: row.raw_data.CREATEDBY || null,
    created_at: formatDate(row.raw_data.CREATEDAT),
    changed_by: row.raw_data.CHANGEDBY || null,
    changed_at: formatDate(row.raw_data.CHANGEDAT),
    user_id: row.user_id,
    source_system: 'SAP',
    original_data: row.raw_data,
    normalized_at: new Date().toISOString(),
  };
}

// Utility to clean invisible characters from keys (e.g., BOM)
function cleanRowKeys(row: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.keys(row).forEach(key => {
    const cleanKey = key.replace(/^[^a-zA-Z0-9]+/, '');
    cleaned[cleanKey] = row[key];
  });
  return cleaned;
}

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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');
    const userId = user.id;

    // Locate the CSV file
    const filePath = path.join(process.cwd(), 'data', 'sap-profitcenter-sample.csv');
    const results: any[] = [];

    await new Promise<void>((resolve, reject) => {
      fsSync.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: Record<string, any>) => {
          const cleanedRow: Record<string, any> = cleanRowKeys(row);
          results.push({
            user_id: userId,
            source_system: 'SAP',
            raw_data: {
              ...cleanedRow,
              scope_3_category_6_miles: cleanedRow.air_travel_miles,
            },
            pull_time: new Date().toISOString(),
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert into Supabase
    const { error } = await supabase
      .from('sap_raw_data')
      .insert(results);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalize only the newly ingested rows for this user
    const { data: rawRows, error: readError } = await supabaseAdmin
      .from('sap_raw_data')
      .select('user_id, raw_data')
      .eq('user_id', userId);
    if (readError) throw new Error(readError.message);
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ message: 'No SAP raw data to normalize after ingest.' });
    }
    const normalizedRows = rawRows.map(normalizeSapRecord);
    const { error: insertError } = await supabaseAdmin
      .from('sap_normalized_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ message: 'SAP data ingested and normalized', rows: results.length, normalized: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 