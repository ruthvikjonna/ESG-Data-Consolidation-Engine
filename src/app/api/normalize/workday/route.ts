import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function normalizeWorkdayRecord(record: any) {
  // Fallback-safe mapping for key fields
  return {
    employee_id: record.Worker_Reference?.Employee_ID || null,
    first_name: record.Worker_Data?.Personal_Data?.Name_Data?.Legal_Name?.Given_Name || null,
    last_name: record.Worker_Data?.Personal_Data?.Name_Data?.Legal_Name?.Family_Name || null,
    email: record.Worker_Data?.Work_Contact_Data?.Work_Email || null,
    title: record.Worker_Data?.Position_Data?.Position_Title || null,
    salary: record.Worker_Data?.Compensation_Data?.Total_Base_Pay?.Amount || null,
    currency: record.Worker_Data?.Compensation_Data?.Total_Base_Pay?.Currency_Reference?.ID || null,
    frequency: record.Worker_Data?.Compensation_Data?.Frequency_Reference?.ID || null,
    hire_date: record.Worker_Data?.Hire_Data?.Hire_Date || null,
    birth_date: record.Worker_Data?.Personal_Data?.Birth_Date || null,
    gender: record.Worker_Data?.Personal_Data?.Gender_Reference?.ID || null,
    original_data: record,
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Read all Workday raw data
    const { data: rawRows, error: readError } = await supabaseAdmin
      .from('workday_raw_data')
      .select('id, user_id, raw_data');
    if (readError) throw new Error(readError.message);
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ message: 'No Workday raw data to normalize.' });
    }

    // 2. Normalize each row
    const normalizedRows = rawRows.map((row: any) => ({
      user_id: row.user_id,
      ...normalizeWorkdayRecord(row.raw_data),
    }));

    // 3. Insert into normalized_employee_data
    const { error: insertError } = await supabaseAdmin
      .from('normalized_employee_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ message: 'Workday normalization complete', count: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 