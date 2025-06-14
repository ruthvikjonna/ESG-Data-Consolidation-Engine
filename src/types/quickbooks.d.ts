declare module 'intuit-oauth' {
  interface OAuthClientOptions {
    clientId: string;
    clientSecret: string;
    environment: string;
    redirectUri: string;
    logging?: boolean;
  }

  interface AuthorizeOptions {
    scope: string[];
    state?: string;
  }

  class OAuthClient {
    constructor(options: OAuthClientOptions);
    
    static scopes: {
      Accounting: string;
      Payment: string;
      Payroll: string;
      TimeTracking: string;
      Benefits: string;
      Profile: string;
      Email: string;
      Phone: string;
      Address: string;
      OpenId: string;
      Intuit_name: string;
    };
    
    authorizeUri(options: AuthorizeOptions): string;
    createToken(uri: string): Promise<any>;
    getToken(): any;
    setToken(token: any): void;
    refresh(): Promise<any>;
    revoke(): Promise<any>;
    isAccessTokenValid(): boolean;
  }
  
  export default OAuthClient;
}

declare module 'node-quickbooks' {
  class QuickBooks {
    constructor(
      consumerKey: string,
      consumerSecret: string,
      accessToken: string,
      useSandbox: boolean,
      realmId: string,
      oauthTokenSecret?: string | undefined,
      refreshToken?: string
    );
    
    getCompanyInfo(options: any, callback: (err: Error | null, data: any) => void): void;
    findCustomers(options: any, callback: (err: Error | null, data: any) => void): void;
    findInvoices(options: any, callback: (err: Error | null, data: any) => void): void;
    findAccounts(options: any, callback: (err: Error | null, data: any) => void): void;
  }
  
  export default QuickBooks;
}
