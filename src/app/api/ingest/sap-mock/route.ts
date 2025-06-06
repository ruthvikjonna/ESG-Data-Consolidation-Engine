import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import csv from 'csv-parser';

export async function POST(req: NextRequest) {
  try {
    // Locate the CSV file
    const filePath = path.join(process.cwd(), 'data', 'mock_sap_data.csv');
    const results: any[] = [];

    await new Promise<void>((resolve, reject) => {
      fsSync.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Normalize row
          results.push({
            user_id: '9cd82ced-076a-4d17-a027-7d25878bbe0b',
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