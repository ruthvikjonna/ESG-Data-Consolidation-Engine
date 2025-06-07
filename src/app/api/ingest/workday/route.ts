import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import sampleData from '@/../data/workday-employee-sample.json';

function normalizeWorkdayRecord(record: any) {
  const rec = Array.isArray(record.data) ? record.data[0] : {};
  return {
    employee_id: rec.Worker_Reference_Employee_ID || null,
    first_name: rec.Worker_Data?.Personal_Data?.Name_Data?.Legal_Name_Data?.Name_Detail_Data?.First_Name || null,
    last_name: rec.Worker_Data?.Personal_Data?.Name_Data?.Legal_Name_Data?.Name_Detail_Data?.Last_Name || null,
    email: rec.Worker_Data?.Personal_Data?.Contact_Data?.Email_Address_Data?.[0]?.Email_Address || null,
    title: rec.Worker_Data?.Employment_Data?.Worker_Job_Data?.[0]?.Position_Data?.Position_Title || null,
    salary: rec.Worker_Data?.Compensation_Data?.Salary_and_Hourly_Data?.[0]?.Amount || null,
    currency: rec.Worker_Data?.Compensation_Data?.Salary_and_Hourly_Data?.[0]?.Currency_Reference_Currency_ID || null,
    frequency: rec.Worker_Data?.Compensation_Data?.Salary_and_Hourly_Data?.[0]?.Frequency_Reference_Frequency_ID || null,
    hire_date: rec.Worker_Data?.Employment_Data?.Worker_Status_Data?.Hire_Date || null,
    birth_date: rec.Worker_Data?.Personal_Data?.Birth_Date || null,
    gender: rec.Worker_Data?.Personal_Data?.Gender_Reference_Gender_Code || null,
    original_data: record,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Use Supabase Auth to get the user
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');
    const user_id = user.id;

    // Ingest sample data
    const rows = [{
      user_id,
      raw_data: sampleData,
      source_system: 'Workday',
      pull_time: new Date().toISOString(),
    }];
    const { error } = await supabase.from('workday_raw_data').insert(rows);
    if (error) throw new Error(error.message);

    // Normalize all raw data for this user
    const { data: rawRows, error: readError } = await supabaseAdmin
      .from('workday_raw_data')
      .select('id, user_id, raw_data')
      .eq('user_id', user_id);
    if (readError) throw new Error(readError.message);
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ message: 'No Workday raw data to normalize after ingest.' });
    }
    const normalizedRows = rawRows.map((row: any) => ({
      user_id: row.user_id,
      ...normalizeWorkdayRecord(row.raw_data),
    }));
    const { error: insertError } = await supabaseAdmin
      .from('workday_normalized_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ message: 'Workday data ingested and normalized', rows: rows.length, normalized: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 