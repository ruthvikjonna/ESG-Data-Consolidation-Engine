import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user_id = req.headers.get('x-user-id') || null; // For now, get user_id from header
    if (!user_id) throw new Error('Missing user_id');
    const records = Array.isArray(body) ? body : [body];
    const rows = records.map((rec: any) => ({
      user_id,
      raw_data: rec,
      source_system: 'Workday',
      pull_time: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin.from('workday_raw_data').insert(rows);
    if (error) throw new Error(error.message);
    return NextResponse.json({ message: 'Workday data ingested', count: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 