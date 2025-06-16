import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client that can access auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side
);

export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user with the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Parse the request body
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

    // Let's directly check for the 'Invoice' key for invoices data
    if (dataType === 'invoices' && data.Invoice && Array.isArray(data.Invoice)) {
      console.log(`Found Invoice array with ${data.Invoice.length} items`);
      
      // ✅ FIXED - Save each invoice individually with user_id
      const insertPromises = data.Invoice.map((invoice: Record<string, any>) => {
        console.log(`Saving invoice with ID: ${invoice.Id}`);
        return supabase
          .from('ingested_data')
          .insert({
            user_id: user.id, // Add the authenticated user's ID
            source_system: `quickbooks`,
            notes: `${dataType}`,
            raw_payload: invoice,
            ingested_at: new Date().toISOString(),
          });
      });
      
      // Wait for all inserts to complete
      const results = await Promise.all(insertPromises);
      
      // Check for errors
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
    
    // For other data types, try to extract based on naming pattern
    let itemsToSave: any[] = [];
    let dataTypeKey = '';
    
    // Try different possible keys based on the dataType
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
      itemsToSave = [data.CompanyInfo]; // Company info is typically a single object
      dataTypeKey = 'CompanyInfo';
    } else {
      // As a fallback, try to find an array in the data
      for (const key in data) {
        if (Array.isArray(data[key])) {
          itemsToSave = data[key];
          dataTypeKey = key;
          console.log(`Found array in key: ${key} with ${itemsToSave.length} items`);
          break;
        }
      }
      
      // If still no array found, use the data as is
      if (itemsToSave.length === 0) {
        console.log('No array found in data, using data as is');
        itemsToSave = Array.isArray(data) ? data : [data];
      }
    }
    
    // Ensure we have items to save
    if (itemsToSave.length === 0) {
      console.log(`No ${dataType} data found to save`);
      return NextResponse.json({
        message: `No ${dataType} data found to save`,
        success: false
      }, { status: 400 });
    }
    
    console.log(`Saving ${itemsToSave.length} ${dataType} items individually`);
    
    // ✅ FIXED - Save each entry individually with user_id
    const insertPromises = itemsToSave.map((entry: Record<string, any>, index: number) => {
      console.log(`Saving ${dataType} item ${index + 1}/${itemsToSave.length}`);
      return supabase
        .from('ingested_data')
        .insert({
          user_id: user.id, // Add the authenticated user's ID
          source_system: `quickbooks`,
          notes: `${dataType}`,
          raw_payload: entry,
          ingested_at: new Date().toISOString(),
        });
    });
    
    // Wait for all inserts to complete
    const results = await Promise.all(insertPromises);
    
    // Check for errors
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
  } catch (error: any) {
    console.error('Error in QuickBooks save API:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message}` },
      { status: 500 }
    );
  }
}