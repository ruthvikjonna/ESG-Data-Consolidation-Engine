import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Normalization logic (adapted from route.ts)
function normalizeRecord(record: any) {
  // Example normalization: map SAP fields to normalized ESG fields
  return {
    company_name: record.company || record.company_name || null,
    metric_type: record.metric || record.metric_type || null,
    value: record.amount || record.value ? Number(record.amount || record.value) : null,
    units: record.unit || record.units || null,
    source_system: 'SAP',
    original_data: record,
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Read all SAP raw data
    const { data: rawRows, error: readError } = await supabaseAdmin
      .from('sap_raw_data')
      .select('id, user_id, raw_data');
    if (readError) throw new Error(readError.message);
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ message: 'No SAP raw data to normalize.' });
    }

    // 2. Normalize each row
    const normalizedRows = rawRows.map((row: any) => ({
      user_id: row.user_id,
      ...normalizeRecord(row.raw_data),
    }));

    // 3. Insert into normalized_esg_data
    const { error: insertError } = await supabaseAdmin
      .from('normalized_esg_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ message: 'Normalization complete', count: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 