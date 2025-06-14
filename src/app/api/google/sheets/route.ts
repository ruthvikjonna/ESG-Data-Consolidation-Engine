import { NextRequest, NextResponse } from 'next/server';
import { 
  createOAuthClient, 
  createSheetsClient, 
  getSpreadsheetData, 
  writeSpreadsheetData,
  createSpreadsheet,
  appendSpreadsheetData,
  clearSpreadsheetRange
} from '@/lib/googleSheetsClient';

// Handler for reading data from Google Sheets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');
    const spreadsheetId = searchParams.get('spreadsheet_id');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Spreadsheet ID is required' },
        { status: 400 }
      );
    }

    // Create OAuth client and set credentials
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Create Google Sheets client
    const sheets = createSheetsClient(oauth2Client);

    // Get spreadsheet metadata to find available sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    if (!spreadsheet.data.sheets || spreadsheet.data.sheets.length === 0) {
      return NextResponse.json(
        { error: 'No sheets found in the spreadsheet' },
        { status: 404 }
      );
    }

    // Get the first sheet's title
    const firstSheet = spreadsheet.data.sheets[0];
    const sheetTitle = firstSheet.properties?.title || 'Sheet1';

    // Get all data from the first sheet
    const values = await getSpreadsheetData(sheets, spreadsheetId, sheetTitle);

    return NextResponse.json({ values });
  } catch (error: any) {
    console.error('Error reading from Google Sheets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read from Google Sheets' },
      { status: 500 }
    );
  }
}

// Handler for writing data to Google Sheets
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      accessToken, 
      spreadsheetId, 
      range, 
      values, 
      operation = 'update' 
    } = data;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Create OAuth client and set credentials
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Create Google Sheets client
    const sheets = createSheetsClient(oauth2Client);

    let result;

    // Determine which operation to perform
    switch (operation) {
      case 'create':
        if (!data.title) {
          return NextResponse.json(
            { error: 'Title is required for spreadsheet creation' },
            { status: 400 }
          );
        }
        result = await createSpreadsheet(sheets, data.title);
        return NextResponse.json({ spreadsheetId: result });
      
      case 'update':
        if (!spreadsheetId || !range || !values) {
          return NextResponse.json(
            { error: 'Spreadsheet ID, range, and values are required for update operation' },
            { status: 400 }
          );
        }
        result = await writeSpreadsheetData(sheets, spreadsheetId, range, values);
        break;
      
      case 'append':
        if (!spreadsheetId || !range || !values) {
          return NextResponse.json(
            { error: 'Spreadsheet ID, range, and values are required for append operation' },
            { status: 400 }
          );
        }
        result = await appendSpreadsheetData(sheets, spreadsheetId, range, values);
        break;
      
      case 'clear':
        if (!spreadsheetId || !range) {
          return NextResponse.json(
            { error: 'Spreadsheet ID and range are required for clear operation' },
            { status: 400 }
          );
        }
        result = await clearSpreadsheetRange(sheets, spreadsheetId, range);
        break;
      
      default:
        return NextResponse.json(
          { error: `Unsupported operation: ${operation}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Error performing Google Sheets operation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform Google Sheets operation' },
      { status: 500 }
    );
  }
}
