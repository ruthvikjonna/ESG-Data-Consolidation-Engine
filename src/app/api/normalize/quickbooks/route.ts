import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function normalizeQuickBooksRecord(row: any) {
  return {
    expense_id: row.raw_data['Expense ID'] || null,
    date: row.raw_data['Date'] || null,
    amount: row.raw_data['Amount'] || null,
    category: row.raw_data['Category'] || null,
    vendor: row.raw_data['Vendor'] || null,
    description: row.raw_data['Description'] || null,
    user_id: row.user_id,
    source_system: 'QuickBooks',
    original_data: row.raw_data,
    normalized_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    // Get user from Supabase Auth
    const supabase = supabaseAdmin;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');
    const userId = user.id;

    // Read all raw QuickBooks data for this user
    const { data: rawRows, error: readError } = await supabase
      .from('quickbooks_raw_data')
      .select('user_id, raw_data')
      .eq('user_id', userId);
    if (readError) throw new Error(readError.message);
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ message: 'No QuickBooks raw data to normalize after ingest.' });
    }
    const normalizedRows = rawRows.map(row => ({
      expense_id: row.raw_data['No.'] || null,
      date: row.raw_data['Date'] || null,
      amount: row.raw_data['Total'] || null,
      category: row.raw_data['Category'] || null,
      vendor: row.raw_data['Payee'] || null,
      description: row.raw_data['Type'] || null,
      user_id: row.user_id,
      source_system: 'QuickBooks',
      original_data: row.raw_data,
      normalized_at: new Date().toISOString(),
    }));
    const { error: insertError } = await supabase
      .from('quickbooks_normalized_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);
    return NextResponse.json({ message: 'QuickBooks normalization complete', count: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('quickbooks_normalized_data')
      .select('*');
    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 