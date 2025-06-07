import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function normalizeSapRecord(row: any) {
  // Helper to convert YYYYMMDD to YYYY-MM-DD
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

export async function POST(req: NextRequest) {
  try {
    // 1. Read all SAP raw data
    const { data: rawRows, error: readError } = await supabaseAdmin
      .from('sap_raw_data')
      .select('user_id, raw_data');
    if (readError) throw new Error(readError.message);
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ message: 'No SAP raw data to normalize.' });
    }

    // 2. Normalize each row
    const normalizedRows = rawRows.map(normalizeSapRecord);

    // 3. Insert into sap_normalized_data
    const { error: insertError } = await supabaseAdmin
      .from('sap_normalized_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ message: 'SAP normalization complete', count: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
