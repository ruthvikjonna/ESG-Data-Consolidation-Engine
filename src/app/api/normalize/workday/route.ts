import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function normalizeWorkdayRecord(record: any) {
  // record is raw_data, so record.data is the array
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

    // 3. Insert into workday_normalized_data
    const { error: insertError } = await supabaseAdmin
      .from('workday_normalized_data')
      .insert(normalizedRows);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ message: 'Workday normalization complete', count: normalizedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 