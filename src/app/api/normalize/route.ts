import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizeRecord } from '@/utils/normalize';

export async function POST(req: NextRequest) {
  try {
    const { user_id, integration_id } = await req.json();

    // 1. Fetch mapping
    const { data: mappingRow, error: mappingError } = await supabaseAdmin
      .from('column_mappings')
      .select('mapping')
      .eq('user_id', user_id)
      .eq('integration_id', integration_id)
      .single();
    if (mappingError || !mappingRow) throw new Error('No mapping found for this integration.');
    const mapping = mappingRow.mapping;

    // 2. Fetch raw data
    const { data: rawRows, error: rawError } = await supabaseAdmin
      .from('raw_data')
      .select('id, raw_data, source_system, ingested_at')
      .eq('user_id', user_id)
      .eq('source_system', integration_id);
    if (rawError) throw new Error(rawError.message);
    if (!rawRows || rawRows.length === 0) throw new Error('No raw data found.');

    // 3. Normalize and insert
    const now = new Date().toISOString();
    const normalizedRows = rawRows.map(row => ({
      user_id,
      source_system: row.source_system,
      normalized_data: normalizeRecord(row.raw_data, mapping),
      original_data: row.raw_data,
      normalized_at: now,
      ingested_at: row.ingested_at,
    }));
    const { error: insertError } = await supabaseAdmin
      .from('normalized_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ message: 'Normalization complete', count: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}