import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

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
    const filePath = path.join(process.cwd(), 'data', 'mock_sap_data.csv');
    const results: any[] = [];

    await new Promise<void>((resolve, reject) => {
      fsSync.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Normalize row
          results.push({
            user_id: userId,
            source_system: 'SAP',
            raw_data: {
              ...row,
              scope_3_category_6_miles: row.air_travel_miles,
            },
            pull_time: new Date().toISOString(),
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert into Supabase
    const { error } = await supabase
      .from('esg_data')
      .insert(results);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Ingested successfully', rows: results.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 