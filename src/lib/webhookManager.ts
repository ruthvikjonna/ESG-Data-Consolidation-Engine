import { supabase } from './supabase';
import { createQBClient } from './quickbooksClient';
import { createSheetsClient, createOAuthClient } from './googleSheetsClient';
import { esgValidationEngine } from './esgValidationEngine';

export interface WebhookPayload {
  source: 'quickbooks' | 'google-sheets' | 'microsoft-graph';
  eventType: string;
  resourceId: string;
  timestamp: string;
  data?: any;
}

export interface DataUpdate {
  id: string;
  source: string;
  resourceId: string;
  eventType: string;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data?: any;
  error?: string;
}

export class WebhookManager {
  private static instance: WebhookManager;
  
  private constructor() {}
  
  public static getInstance(): WebhookManager {
    if (!WebhookManager.instance) {
      WebhookManager.instance = new WebhookManager();
    }
    return WebhookManager.instance;
  }

  /**
   * Process incoming webhook from any data source
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    try {
      console.log(`Processing webhook from ${payload.source}:`, payload);

      // Create data update record
      const updateId = await this.createDataUpdate(payload);

      // Process based on source
      switch (payload.source) {
        case 'quickbooks':
          await this.processQuickBooksWebhook(payload, updateId);
          break;
        case 'google-sheets':
          await this.processGoogleSheetsWebhook(payload, updateId);
          break;
        case 'microsoft-graph':
          await this.processMicrosoftGraphWebhook(payload, updateId);
          break;
        default:
          throw new Error(`Unknown webhook source: ${payload.source}`);
      }

      // Mark as completed
      await this.updateDataUpdateStatus(updateId, 'completed');
      
      console.log(`Webhook processed successfully: ${updateId}`);
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Process QuickBooks webhook (new invoices, transactions, etc.)
   */
  private async processQuickBooksWebhook(payload: WebhookPayload, updateId: string): Promise<void> {
    try {
      // Get stored QuickBooks credentials
      const { data: credentials } = await supabase
        .from('integration_credentials')
        .select('*')
        .eq('platform', 'quickbooks')
        .single();

      if (!credentials) {
        throw new Error('QuickBooks credentials not found');
      }

      // Create QuickBooks client
      const qbClient = createQBClient(
        credentials.access_token,
        credentials.realm_id
      );

      // Fetch updated data based on event type
      let updatedData;
      switch (payload.eventType) {
        case 'invoice.created':
        case 'invoice.updated':
          updatedData = await this.fetchQuickBooksInvoices(qbClient, payload.resourceId);
          break;
        case 'transaction.created':
        case 'transaction.updated':
          updatedData = await this.fetchQuickBooksTransactions(qbClient, payload.resourceId);
          break;
        default:
          updatedData = await this.fetchQuickBooksResource(qbClient, payload.resourceId);
      }

      // Validate and store the updated data
      await this.validateAndStoreData('quickbooks', updatedData, payload.eventType);
      
    } catch (error) {
      await this.updateDataUpdateStatus(updateId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Process Google Sheets webhook (spreadsheet updates)
   */
  private async processGoogleSheetsWebhook(payload: WebhookPayload, updateId: string): Promise<void> {
    try {
      // Get stored Google credentials
      const { data: credentials } = await supabase
        .from('integration_credentials')
        .select('*')
        .eq('platform', 'google-sheets')
        .single();

      if (!credentials) {
        throw new Error('Google Sheets credentials not found');
      }

      // Create Google Sheets client
      const oauthClient = createOAuthClient();
      oauthClient.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
      });
      
      const sheetsClient = createSheetsClient(oauthClient);

      // Fetch updated spreadsheet data
      const updatedData = await this.fetchGoogleSheetsData(sheetsClient, payload.resourceId);

      // Validate and store the updated data
      await this.validateAndStoreData('google-sheets', updatedData, payload.eventType);
      
    } catch (error) {
      await this.updateDataUpdateStatus(updateId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Process Microsoft Graph webhook (Excel file changes)
   */
  private async processMicrosoftGraphWebhook(payload: WebhookPayload, updateId: string): Promise<void> {
    try {
      // Get stored Microsoft credentials
      const { data: credentials } = await supabase
        .from('integration_credentials')
        .select('*')
        .eq('platform', 'microsoft-graph')
        .single();

      if (!credentials) {
        throw new Error('Microsoft Graph credentials not found');
      }

      // Fetch updated Excel data
      const updatedData = await this.fetchMicrosoftGraphData(credentials.access_token, payload.resourceId);

      // Validate and store the updated data
      await this.validateAndStoreData('microsoft-graph', updatedData, payload.eventType);
      
    } catch (error) {
      await this.updateDataUpdateStatus(updateId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Fetch QuickBooks invoices
   */
  private async fetchQuickBooksInvoices(qbClient: any, resourceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      qbClient.getInvoice(resourceId, (err: Error | null, invoice: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(invoice);
      });
    });
  }

  /**
   * Fetch QuickBooks transactions
   */
  private async fetchQuickBooksTransactions(qbClient: any, resourceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      qbClient.getTransaction(resourceId, (err: Error | null, transaction: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(transaction);
      });
    });
  }

  /**
   * Fetch generic QuickBooks resource
   */
  private async fetchQuickBooksResource(qbClient: any, resourceId: string): Promise<any> {
    // This would need to be implemented based on the specific resource type
    // For now, return a placeholder
    return { id: resourceId, type: 'unknown' };
  }

  /**
   * Fetch Google Sheets data
   */
  private async fetchGoogleSheetsData(sheetsClient: any, spreadsheetId: string): Promise<any> {
    try {
      const response = await sheetsClient.spreadsheets.get({
        spreadsheetId,
        includeGridData: true,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Google Sheets data: ${error.message}`);
    }
  }

  /**
   * Fetch Microsoft Graph data
   */
  private async fetchMicrosoftGraphData(accessToken: string, resourceId: string): Promise<any> {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${resourceId}/content`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch Microsoft Graph data: ${error.message}`);
    }
  }

  /**
   * Validate and store updated data
   */
  private async validateAndStoreData(source: string, data: any, eventType: string): Promise<void> {
    try {
      // Run data through validation engine
      const validatedData = await this.validateData(data, source);
      
      // Store in unified schema
      await this.storeUnifiedData(validatedData, source, eventType);
      
      // Update data freshness tracking
      await this.updateDataFreshness(source, eventType);
      
    } catch (error) {
      console.error('Error validating and storing data:', error);
      throw error;
    }
  }

  /**
   * Validate incoming data against ESG schemas
   */
  private async validateData(data: any, source: string): Promise<any> {
    try {
      const validationResult = await esgValidationEngine.validateData(data, source);
      
      // Log validation results
      console.log(`ESG Validation for ${source}:`, {
        isValid: validationResult.isValid,
        score: validationResult.score,
        errors: validationResult.errors.length,
        warnings: validationResult.warnings.length,
      });
      
      // If there are critical errors, log them
      if (validationResult.errors.some(e => e.severity === 'critical')) {
        console.error('Critical ESG validation errors:', validationResult.errors.filter(e => e.severity === 'critical'));
      }
      
      // Return validated data with validation metadata
      return {
        ...data,
        _validation: validationResult,
      };
    } catch (error) {
      console.error('Error during ESG validation:', error);
      // Return data as-is if validation fails
      return data;
    }
  }

  /**
   * Store data in unified ESG schema
   */
  private async storeUnifiedData(data: any, source: string, eventType: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('unified_esg_data')
        .upsert({
          source,
          event_type: eventType,
          data,
          last_updated: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error storing unified data:', error);
      throw error;
    }
  }

  /**
   * Update data freshness tracking
   */
  private async updateDataFreshness(source: string, eventType: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('data_freshness')
        .upsert({
          source,
          last_update: new Date().toISOString(),
          event_type: eventType,
          status: 'current',
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating data freshness:', error);
      throw error;
    }
  }

  /**
   * Create data update record
   */
  private async createDataUpdate(payload: WebhookPayload): Promise<string> {
    const { data, error } = await supabase
      .from('data_updates')
      .insert({
        source: payload.source,
        resource_id: payload.resourceId,
        event_type: payload.eventType,
        timestamp: payload.timestamp,
        status: 'pending',
        data: payload.data,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id;
  }

  /**
   * Update data update status
   */
  private async updateDataUpdateStatus(updateId: string, status: string, error?: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('data_updates')
      .update({
        status,
        error,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updateId);

    if (updateError) {
      console.error('Error updating data update status:', updateError);
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<any> {
    try {
      const { data: stats, error } = await supabase
        .from('data_updates')
        .select('source, status, count')
        .select('*');

      if (error) {
        throw error;
      }

      return stats;
    } catch (error) {
      console.error('Error fetching webhook stats:', error);
      throw error;
    }
  }
}

export const webhookManager = WebhookManager.getInstance();
