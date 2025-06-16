import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');
    
    switch (service) {
      case 'google':
        return handleGoogleSave(req);
      case 'quickbooks':
        return handleQuickBooksSave(req);
      case 'manual':
        return handleManualSave(req);
      default:
        return NextResponse.json(
          { error: 'Service parameter required. Use: google, quickbooks, or manual' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save data' },
      { status: 500 }
    );
  }
}

async function handleGoogleSave(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authorization token is required' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  const data = await req.json();
  const { sheetData, spreadsheetId, sheetName } = data;
  
  if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
    return NextResponse.json(
      { error: 'Valid sheet data is required' },
      { status: 400 }
    );
  }

  if (!spreadsheetId) {
    return NextResponse.json(
      { error: 'Spreadsheet ID is required' },
      { status: 400 }
    );
  }

  const headers = sheetData[0].map((header: string) => header.trim().toLowerCase().replace(/\s+/g, '_'));
  const dataRows = sheetData.slice(1).map((row: any[]) => {
    const rowData: Record<string, any> = {};
    
    headers.forEach((header: string, index: number) => {
      rowData[header] = row[index] || null;
    });
    
    rowData.source = 'google_sheets';
    rowData.spreadsheet_id = spreadsheetId;
    rowData.sheet_name = sheetName || 'unknown';
    rowData.imported_at = new Date().toISOString();
    
    return rowData;
  });

  const { error } = await supabase.from("ingested_data").insert(
    dataRows.map((row: any) => ({
      user_id: user.id,
      source_system: "google_sheets",
      raw_payload: row,
      ingested_at: new Date().toISOString(),
    }))
  );

  if (error) {
    console.error('Error saving data to database:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save data to database' },
      { status: 500 }
    );
  }

  return NextResponse.json({ 
    success: true,
    message: `Successfully saved ${dataRows.length} rows to database`,
    insertedCount: dataRows.length
  });
}

async function handleQuickBooksSave(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authorization token is required' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { dataType, data } = body;

  console.log('Received save request for dataType:', dataType);
  console.log('Data structure:', Object.keys(data));

  if (!dataType || !data) {
    return NextResponse.json(
      { error: 'Missing required fields: dataType and data' },
      { status: 400 }
    );
  }

  if (dataType === 'invoices' && data.Invoice && Array.isArray(data.Invoice)) {
    console.log(`Found Invoice array with ${data.Invoice.length} items`);
    
    const insertPromises = data.Invoice.map((invoice: Record<string, any>) => {
      console.log(`Saving invoice with ID: ${invoice.Id}`);
      return supabase
        .from('ingested_data')
        .insert({
          user_id: user.id,
          source_system: `quickbooks`,
          notes: `${dataType}`,
          raw_payload: invoice,
          ingested_at: new Date().toISOString(),
        });
    });
    
    const results = await Promise.all(insertPromises);
    const errors = results.filter(result => result.error).map(result => result.error);
    
    if (errors.length > 0) {
      console.error('Error saving QuickBooks invoices to database:', errors);
      return NextResponse.json(
        { error: `Failed to save some invoices: ${errors[0]?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log(`Successfully saved ${data.Invoice.length} individual invoices`);
    return NextResponse.json({
      message: `QuickBooks invoices saved successfully (${data.Invoice.length} individual entries)`,
      success: true,
    });
  }
  
  let itemsToSave: any[] = [];
  let dataTypeKey = '';
  
  if (dataType === 'customers' && data.Customer) {
    itemsToSave = data.Customer;
    dataTypeKey = 'Customer';
  } else if (dataType === 'bills' && data.Bill) {
    itemsToSave = data.Bill;
    dataTypeKey = 'Bill';
  } else if (dataType === 'purchases' && data.Purchase) {
    itemsToSave = data.Purchase;
    dataTypeKey = 'Purchase';
  } else if (dataType === 'accounts' && data.Account) {
    itemsToSave = data.Account;
    dataTypeKey = 'Account';
  } else if (dataType === 'company' && data.CompanyInfo) {
    itemsToSave = [data.CompanyInfo];
    dataTypeKey = 'CompanyInfo';
  } else {
    for (const key in data) {
      if (Array.isArray(data[key])) {
        itemsToSave = data[key];
        dataTypeKey = key;
        console.log(`Found array in key: ${key} with ${itemsToSave.length} items`);
        break;
      }
    }
    
    if (itemsToSave.length === 0) {
      console.log('No array found in data, using data as is');
      itemsToSave = Array.isArray(data) ? data : [data];
    }
  }
  
  if (itemsToSave.length === 0) {
    console.log(`No ${dataType} data found to save`);
    return NextResponse.json({
      message: `No ${dataType} data found to save`,
      success: false
    }, { status: 400 });
  }
  
  console.log(`Saving ${itemsToSave.length} ${dataType} items individually`);
  
  const insertPromises = itemsToSave.map((entry: Record<string, any>, index: number) => {
    console.log(`Saving ${dataType} item ${index + 1}/${itemsToSave.length}`);
    return supabase
      .from('ingested_data')
      .insert({
        user_id: user.id,
        source_system: `quickbooks`,
        notes: `${dataType}`,
        raw_payload: entry,
        ingested_at: new Date().toISOString(),
      });
  });
  
  const results = await Promise.all(insertPromises);
  const errors = results.filter(result => result.error).map(result => result.error);
  
  if (errors.length > 0) {
    console.error(`Error saving QuickBooks ${dataType} to database:`, errors);
    return NextResponse.json(
      { error: `Failed to save some ${dataType}: ${errors[0]?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }

  console.log(`Successfully saved ${itemsToSave.length} individual ${dataType} items`);
  return NextResponse.json({
    message: `QuickBooks ${dataType} data saved successfully (${itemsToSave.length} individual entries)`,
    success: true,
    dataTypeKey,
  });
}

async function handleManualSave(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const user_id = formData.get('user_id') as string;
  const source_system = formData.get('source_system') as string;

  if (!file || !user_id || !source_system) {
    throw new Error("Missing required fields (file, user_id, source_system).");
  }

  const rows = await parseFile(file);

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No valid data found in file.");
  }

  const rawRows = rows.map((row: Record<string, any>) => ({
    user_id,
    source_system,
    raw_data: row,
    ingested_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin.from('raw_data').insert(rawRows);
  if (error) throw new Error(error.message);

  return NextResponse.json({
    message: "Ingest complete",
    count: rawRows.length,
    fileType: file.name.split('.').pop()?.toLowerCase(),
  });
}

async function parseFile(file: File): Promise<any[]> {
  const fileType = file.name.split('.').pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  switch (fileType) {
    case 'csv':
      return parse(buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      });

    case 'xlsx':
    case 'xls':
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(firstSheet);

    case 'json':
      const text = buffer.toString();
      const json = JSON.parse(text);
      return Array.isArray(json) ? json : json.data || [json];

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
} 