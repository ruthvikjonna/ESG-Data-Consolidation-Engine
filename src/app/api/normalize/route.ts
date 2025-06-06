import { NextRequest, NextResponse } from 'next/server';

// Example normalization mapping
function normalizeRecord(record: any) {
  const normalized: any = {
    ...record,
    // Field mappings
    scope_3_category_6_miles: record.air_travel_miles ?? null,
    scope_3_category_6_km: record.business_travel_km ?? (record.air_travel_miles ? record.air_travel_miles * 1.60934 : null),
    scope_1_natural_gas_therms: record.natural_gas_therms ?? null,
    energy_mwh: record.energy_kwh ? record.energy_kwh / 1000 : null,
  };

  const flags: string[] = [];

  // Flag missing required fields
  if (normalized.scope_3_category_6_miles == null && normalized.scope_3_category_6_km == null) {
    flags.push('Missing business travel distance (miles or km)');
  }
  if (record.natural_gas_therms == null) {
    flags.push('Missing natural gas usage');
  }
  // Flag negative or unreasonable values
  if (normalized.scope_3_category_6_miles != null && normalized.scope_3_category_6_miles < 0) {
    flags.push('Negative air travel miles');
  }
  if (normalized.scope_3_category_6_km != null && normalized.scope_3_category_6_km < 0) {
    flags.push('Negative business travel km');
  }
  if (normalized.scope_1_natural_gas_therms != null && normalized.scope_1_natural_gas_therms < 0) {
    flags.push('Negative natural gas usage');
  }
  if (record.energy_kwh != null && record.energy_kwh < 0) {
    flags.push('Negative energy_kwh');
  }
  if (normalized.energy_mwh != null && normalized.energy_mwh < 0) {
    flags.push('Negative energy_mwh');
  }

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