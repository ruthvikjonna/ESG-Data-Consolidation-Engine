import { NextRequest, NextResponse } from 'next/server';

interface ESGRecord {
  employee_id?: string;
  air_travel_miles?: number;
  business_travel_km?: number;
  natural_gas_therms?: number;
  energy_kwh?: number;
}

interface NormalizedRecord extends ESGRecord {
  scope_3_category_6_miles: number | null;
  scope_3_category_6_km: number | null;
  scope_1_natural_gas_therms: number | null;
  energy_mwh: number | null;
}

function normalizeRecord(record: ESGRecord) {
  const normalized: NormalizedRecord = {
    ...record,
    scope_3_category_6_miles: record.air_travel_miles ?? null,
    scope_3_category_6_km:
      record.business_travel_km ??
      (record.air_travel_miles ? record.air_travel_miles * 1.60934 : null),
    scope_1_natural_gas_therms: record.natural_gas_therms ?? null,
    energy_mwh: record.energy_kwh ? record.energy_kwh / 1000 : null,
  };

  const flags: string[] = [];

  if (
    normalized.scope_3_category_6_miles == null &&
    normalized.scope_3_category_6_km == null
  ) {
    flags.push('Missing business travel distance (miles or km)');
  }
  if (record.natural_gas_therms == null) {
    flags.push('Missing natural gas usage');
  }
  if (
    normalized.scope_3_category_6_miles != null &&
    normalized.scope_3_category_6_miles < 0
  ) {
    flags.push('Negative air travel miles');
  }
  if (
    normalized.scope_3_category_6_km != null &&
    normalized.scope_3_category_6_km < 0
  ) {
    flags.push('Negative business travel km');
  }
  if (
    normalized.scope_1_natural_gas_therms != null &&
    normalized.scope_1_natural_gas_therms < 0
  ) {
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
    const records: ESGRecord[] = Array.isArray(body) ? body : [body];
    const results = records.map(normalizeRecord);
    return NextResponse.json({
      normalized: results.map((r) => r.normalized),
      flags: results.map((r) => r.flags),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Normalize API is live' });
}
