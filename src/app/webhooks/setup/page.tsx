'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  Check, 
  ExternalLink,
  Database,
  TrendingUp,
  Shield,
  AlertCircle,
  Info
} from 'lucide-react';

export default function WebhookSetupPage() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const webhookUrls = {
    quickbooks: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/quickbooks`,
    'google-sheets': `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/google-sheets`,
    'microsoft-graph': `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/microsoft-graph`,
  };

  const copyToClipboard = async (text: string, source: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(source);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getWebhookUrl = (source: string) => {
    return webhookUrls[source as keyof typeof webhookUrls];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Webhook Setup Guide</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Configure webhooks to automatically receive ESG data updates from your connected platforms. 
          This eliminates manual data collection and keeps your ESG reporting current in real-time.
        </p>
      </div>

      {/* Benefits Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Why Webhooks Transform ESG Reporting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-blue-700">
              <h4 className="font-semibold mb-2">🚫 Before Webhooks</h4>
              <ul className="space-y-1">
                <li>• 280 hours per quarter</li>
                <li>• Manual data collection</li>
                <li>• Quarterly updates only</li>
                <li>• Risk of outdated data</li>
              </ul>
            </div>
            <div className="text-green-700">
              <h4 className="font-semibold mb-2">✅ With Webhooks</h4>
              <ul className="space-y-1">
                <li>• Real-time updates</li>
                <li>• Automatic validation</li>
                <li>• Always current data</li>
                <li>• 70% time savings</li>
              </ul>
            </div>
            <div className="text-purple-700">
              <h4 className="font-semibold mb-2">🎯 Key Benefits</h4>
              <ul className="space-y-1">
                <li>• Instant ESG compliance scoring</li>
                <li>• Automated data quality checks</li>
                <li>• Unified data consolidation</li>
                <li>• Proactive issue detection</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Tabs defaultValue="quickbooks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quickbooks" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>QuickBooks</span>
          </TabsTrigger>
          <TabsTrigger value="google-sheets" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Google Sheets</span>
          </TabsTrigger>
          <TabsTrigger value="microsoft-graph" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Microsoft Graph</span>
          </TabsTrigger>
        </TabsList>

        {/* QuickBooks Setup */}
        <TabsContent value="quickbooks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-500" />
                QuickBooks Webhook Setup
              </CardTitle>
              <CardDescription>
                Configure QuickBooks to send webhooks when invoices, transactions, or other data changes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Webhook URL</h4>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm">
                    {getWebhookUrl('quickbooks')}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getWebhookUrl('quickbooks'), 'quickbooks')}
                  >
                    {copiedUrl === 'quickbooks' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Setup Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    <strong>Access QuickBooks Developer Portal:</strong>
                    <a 
                      href="https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-2 inline-flex items-center"
                    >
                      Developer Documentation <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                  <li><strong>Create a new app</strong> or use existing QuickBooks app</li>
                  <li><strong>Enable webhooks</strong> in your app settings</li>
                  <li><strong>Add the webhook URL</strong> above to your app configuration</li>
                  <li><strong>Select events</strong> to monitor (invoices, transactions, etc.)</li>
                  <li><strong>Save and test</strong> the webhook configuration</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-yellow-800">Important Notes:</h5>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      <li>• QuickBooks webhooks require a paid developer account</li>
                      <li>• Webhooks are only sent for production companies, not sandbox</li>
                      <li>• Ensure your app has the necessary OAuth scopes</li>
                      <li>• Test webhooks in development environment first</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Sheets Setup */}
        <TabsContent value="google-sheets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Google Sheets Webhook Setup
              </CardTitle>
              <CardDescription>
                Configure Google Sheets to send webhooks when spreadsheets are updated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Webhook URL</h4>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm">
                    {getWebhookUrl('google-sheets')}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getWebhookUrl('google-sheets'), 'google-sheets')}
                  >
                    {copiedUrl === 'google-sheets' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Setup Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    <strong>Access Google Cloud Console:</strong>
                    <a 
                      href="https://console.cloud.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-2 inline-flex items-center"
                    >
                      Cloud Console <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                  <li><strong>Create a new project</strong> or select existing project</li>
                  <li><strong>Enable Google Drive API</strong> and Google Sheets API</li>
                  <li><strong>Create credentials</strong> (OAuth 2.0 or Service Account)</li>
                  <li><strong>Set up webhook endpoint</strong> using the URL above</li>
                  <li><strong>Configure watch requests</strong> for specific spreadsheets</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-blue-800">Google Sheets Webhook Details:</h5>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Webhooks expire after 1 hour and need renewal</li>
                      <li>• Can watch up to 1000 files per user</li>
                      <li>• Supports real-time notifications for file changes</li>
                      <li>• Requires proper OAuth scopes for file access</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Microsoft Graph Setup */}
        <TabsContent value="microsoft-graph">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-purple-500" />
                Microsoft Graph Webhook Setup
              </CardTitle>
              <CardDescription>
                Configure Microsoft Graph to send webhooks when Excel files change
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Webhook URL</h4>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm">
                    {getWebhookUrl('microsoft-graph')}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getWebhookUrl('microsoft-graph'), 'microsoft-graph')}
                  >
                    {copiedUrl === 'microsoft-graph' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Setup Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    <strong>Access Microsoft Graph Explorer:</strong>
                    <a 
                      href="https://developer.microsoft.com/en-us/graph/graph-explorer" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-2 inline-flex items-center"
                    >
                      Graph Explorer <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                  <li><strong>Register your application</strong> in Azure Portal</li>
                  <li><strong>Get application credentials</strong> (Client ID and Secret)</li>
                  <li><strong>Configure permissions</strong> for Files.Read.All</li>
                  <li><strong>Create subscription</strong> using the webhook URL above</li>
                  <li><strong>Test webhook delivery</strong> with sample files</li>
                </ol>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-purple-800">Microsoft Graph Webhook Details:</h5>
                    <ul className="text-sm text-purple-700 mt-1 space-y-1">
                      <li>• Webhooks expire after 3 days and need renewal</li>
                      <li>• Supports OneDrive, SharePoint, and Teams files</li>
                      <li>• Real-time notifications for file modifications</li>
                      <li>• Requires Microsoft 365 subscription for full features</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Testing Section */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Your Webhooks</CardTitle>
          <CardDescription>
            Verify that your webhooks are working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Test Webhook Delivery</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Use these tools to test webhook delivery to your endpoints:
              </p>
              <ul className="text-sm space-y-1">
                <li>• <strong>Webhook.site</strong> - Temporary webhook testing</li>
                <li>• <strong>ngrok</strong> - Local development tunneling</li>
                <li>• <strong>Postman</strong> - Manual webhook simulation</li>
                <li>• <strong>cURL</strong> - Command-line testing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Monitor Dashboard</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Check your webhook dashboard to see incoming webhooks:
              </p>
              <Button 
                onClick={() => window.location.href = '/webhooks'}
                className="w-full"
              >
                View Webhook Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Common Issues & Solutions</CardTitle>
          <CardDescription>
            Solutions to frequently encountered webhook setup problems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-red-200 pl-4">
              <h4 className="font-semibold text-red-800">Webhook Not Receiving Data</h4>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                <li>• Check if your webhook URL is publicly accessible</li>
                <li>• Verify SSL certificate (HTTPS required for production)</li>
                <li>• Ensure proper authentication headers are configured</li>
                <li>• Check platform-specific webhook expiration settings</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-yellow-200 pl-4">
              <h4 className="font-semibold text-yellow-800">Authentication Errors</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Verify OAuth tokens are valid and not expired</li>
                <li>• Check API key permissions and scopes</li>
                <li>• Ensure webhook signature verification is properly implemented</li>
                <li>• Test with platform&apos;s webhook testing tools</li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-200 pl-4">
              <h4 className="font-semibold text-blue-800">Data Processing Issues</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Check webhook payload format matches expected schema</li>
                <li>• Verify ESG validation engine is properly configured</li>
                <li>• Monitor database connection and storage permissions</li>
                <li>• Review error logs for specific failure reasons</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
