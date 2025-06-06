import { NextRequest, NextResponse } from 'next/server';

// Example normalization mapping
function normalizeRecord(record: any) {
  const normalized: any = {
    ...record,
    scope_3_category_6_miles: record.air_travel_miles || null,
  };
  const flags: string[] = [];
  if (!record.air_travel_miles) {
    flags.push('Missing air_travel_miles');
  }
  // Add more normalization and flagging logic as needed
  return { normalized, flags };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const records = Array.isArray(body) ? body : [body];
    const results = records.map(normalizeRecord);
    return NextResponse.json({
      normalized: results.map(r => r.normalized),
      flags: results.map(r => r.flags),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 