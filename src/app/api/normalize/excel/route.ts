import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    // Extract access token from Authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : undefined;
    // Get user from Supabase Auth using the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error('User not authenticated');
    const userId = user.id;

    // Read all raw Excel data for this user
    const { data: rawRows, error: readError } = await supabaseAdmin
      .from('excel_raw_data')
      .select('user_id, raw_data')
      .eq('user_id', userId);
    if (readError) throw new Error(readError.message);
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ message: 'No Excel raw data to normalize.' });
    }
    const normalizedRows = rawRows.map(row => ({
      vendor: row.raw_data['Vendor'] || null,
      category: row.raw_data['Category'] || null,
      amount_usd: row.raw_data['Amount (USD)'] || null,
      date: row.raw_data['Date'] || null,
      emission_scope: row.raw_data['Emission Scope'] || null,
      notes: row.raw_data['Notes'] || null,
      user_id: row.user_id,
      source_system: 'excel',
      original_data: row.raw_data,
      normalized_at: new Date().toISOString(),
    }));
    const { error: insertError } = await supabaseAdmin
      .from('excel_normalized_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);
    return NextResponse.json({ message: 'Excel normalization complete', count: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 