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

    // Read all raw Google Sheets data for this user
    const { data: rawRows, error: readError } = await supabaseAdmin
      .from('google_sheets_raw_data')
      .select('user_id, raw_data')
      .eq('user_id', userId);
    if (readError) throw new Error(readError.message);
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ message: 'No Google Sheets raw data to normalize.' });
    }
    const normalizedRows = rawRows.map(row => ({
      department: row.raw_data['Department'] || null,
      headcount: row.raw_data['Headcount'] || null,
      dei_score: row.raw_data['DEI Score'] || null,
      attrition_rate: row.raw_data['Attrition Rate (%)'] || row.raw_data['Attrition Rate'] || null,
      reporting_period: row.raw_data['Reporting Period'] || null,
      notes: row.raw_data['Notes'] || null,
      user_id: row.user_id,
      source_system: 'google_sheets',
      original_data: row.raw_data,
      normalized_at: new Date().toISOString(),
    }));
    const { error: insertError } = await supabaseAdmin
      .from('google_sheets_normalized_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);
    return NextResponse.json({ message: 'Google Sheets normalization complete', count: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 