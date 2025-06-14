import { google, sheets_v4 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Google OAuth client configuration
export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

// Function to generate the authorization URL
export function getAuthorizationUrl(oauth2Client: OAuth2Client): string {
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(oauth2Client: OAuth2Client, code: string): Promise<any> {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Set up auth client with tokens
export function setCredentials(oauth2Client: OAuth2Client, tokens: any): void {
  oauth2Client.setCredentials(tokens);
}

// Create a Sheets API client
export function createSheetsClient(oauth2Client: OAuth2Client): sheets_v4.Sheets {
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Helper function to list all spreadsheets accessible to the user
export async function listSpreadsheets(
  oauth2Client: OAuth2Client
): Promise<{ id: string; name: string }[]> {
  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Search for all Google Sheets files
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name)',
      orderBy: 'modifiedTime desc'
    });
    
    if (!response.data.files || response.data.files.length === 0) {
      return [];
    }
    
    return response.data.files.map(file => ({
      id: file.id!,
      name: file.name!
    }));
  } catch (error) {
    console.error('Error listing spreadsheets:', error);
    throw error;
  }
}

// Helper function to read spreadsheet data
export async function getSpreadsheetData(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetTitle: string
): Promise<any> {
  try {
    // If sheetTitle doesn't contain '!', assume it's just the sheet name and fetch all data
    const range = sheetTitle.includes('!') ? sheetTitle : sheetTitle;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: range,
    });
    return response.data.values;
  } catch (error) {
    console.error('Error fetching spreadsheet data:', error);
    throw error;
  }
}

// Helper function to write data to spreadsheet
export async function writeSpreadsheetData(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error writing to spreadsheet:', error);
    throw error;
  }
}

// Helper function to create a new spreadsheet
export async function createSpreadsheet(
  sheets: sheets_v4.Sheets,
  title: string
): Promise<string> {
  try {
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
      },
    });
    return response.data.spreadsheetId!;
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

// Helper function to add a sheet to an existing spreadsheet
export async function addSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetTitle: string
): Promise<any> {
  try {
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetTitle,
              },
            },
          },
        ],
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error adding sheet:', error);
    throw error;
  }
}

// Helper function to clear data from a range
export async function clearSpreadsheetRange(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string
): Promise<any> {
  try {
    const response = await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
    return response.data;
  } catch (error) {
    console.error('Error clearing spreadsheet range:', error);
    throw error;
  }
}

// Helper function to append data to a spreadsheet
export async function appendSpreadsheetData(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error appending to spreadsheet:', error);
    throw error;
  }
}

// Token management functions
export function saveTokens(tokens: any): void {
  // In a real application, you would store these tokens securely
  // This is just a placeholder - implement proper secure storage
  console.log('Tokens received:', tokens);
  // Example: Store in database, encrypted storage, etc.
}

// Refresh access token when it expires
export async function refreshAccessToken(oauth2Client: OAuth2Client, refreshToken: string): Promise<any> {
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    // Update stored tokens
    saveTokens(credentials);
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}
