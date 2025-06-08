import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    // Get user from Supabase Auth
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();
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
      employee_id: row.raw_data['Employee ID'] || null,
      first_name: row.raw_data['First Name'] || null,
      last_name: row.raw_data['Last Name'] || null,
      email: row.raw_data['Email'] || null,
      title: row.raw_data['Title'] || null,
      department: row.raw_data['Department'] || null,
      hire_date: row.raw_data['Hire Date'] || null,
      salary: row.raw_data['Salary'] || null,
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