import OAuthClient from 'intuit-oauth';
import QuickBooks from 'node-quickbooks';

// QuickBooks OAuth client configuration
export const oauthClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID!,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
  environment: 'sandbox', // or 'production' for live data
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!,
});

// Function to generate the authorization URL
export function getAuthorizationUrl(): string {
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: 'testState', // Consider using a dynamic state value for security
  });
  return authUri;
}

// Create a QuickBooks API client using token and realmId
export function createQBClient(accessToken: string, realmId: string): any {
  // For OAuth2, we need to create the client a bit differently
  // We're using any type here because the TypeScript definitions don't match the actual implementation
  const qbo = new (QuickBooks as any)(
    process.env.QUICKBOOKS_CLIENT_ID!,
    process.env.QUICKBOOKS_CLIENT_SECRET!,
    accessToken,
    true, // use the sandbox environment
    realmId,
    undefined, // oauthTokenSecret - not used in OAuth2
    undefined // refreshToken - we'll handle refresh separately
  );

  return qbo;
}

// Helper function to retrieve company info (to test the connection)
export async function getCompanyInfo(qbo: any): Promise<any> {
  return new Promise((resolve, reject) => {
    qbo.getCompanyInfo(null, (err: Error | null, companyInfo: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(companyInfo);
    });
  });
}

// Helper functions for various QuickBooks data types
export async function getCustomers(qbo: any): Promise<any> {
  return new Promise((resolve, reject) => {
    qbo.findCustomers({}, (err: Error | null, customers: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(customers);
    });
  });
}

export async function getInvoices(qbo: any): Promise<any> {
  return new Promise((resolve, reject) => {
    qbo.findInvoices({}, (err: Error | null, invoices: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(invoices);
    });
  });
}

export async function getAccounts(qbo: any): Promise<any> {
  return new Promise((resolve, reject) => {
    qbo.findAccounts({}, (err: Error | null, accounts: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(accounts);
    });
  });
}

// Token management functions
export function saveTokens(token: any): void {
  // In a real application, you would store these tokens securely
  // This is just a placeholder - implement proper secure storage
  console.log('Tokens received:', token);
  // Example: Store in database, encrypted storage, etc.
}

export function refreshAccessToken(refreshToken: string): Promise<any> {
  oauthClient.setToken({
    refresh_token: refreshToken,
  });
  
  return oauthClient.refresh()
    .then((authResponse: any) => {
      const token = authResponse.getJson();
      // Update stored tokens
      saveTokens(token);
      return token;
    });
}
