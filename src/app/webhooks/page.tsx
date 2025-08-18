'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  Database,
  Shield
} from 'lucide-react';

interface WebhookStats {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  bySource: {
    quickbooks: number;
    'google-sheets': number;
    'microsoft-graph': number;
  };
}

interface DataUpdate {
  id: string;
  source: string;
  resource_id: string;
  event_type: string;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  created_at: string;
}

interface DataFreshness {
  source: string;
  last_update: string;
  event_type: string;
  status: string;
}

export default function WebhooksPage() {
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<DataUpdate[]>([]);
  const [dataFreshness, setDataFreshness] = useState<DataFreshness[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWebhookData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchWebhookData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchWebhookData = async () => {
    try {
      setLoading(true);
      
      // Fetch webhook statistics
      const statsResponse = await fetch('/api/webhooks/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch recent data updates
      const updatesResponse = await fetch('/api/webhooks/updates');
      const updatesData = await updatesResponse.json();
      setRecentUpdates(updatesData);

      // Fetch data freshness
      const freshnessResponse = await fetch('/api/webhooks/freshness');
      const freshnessData = await freshnessResponse.json();
      setDataFreshness(freshnessData);

    } catch (error) {
      console.error('Error fetching webhook data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchWebhookData();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'quickbooks':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'google-sheets':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'microsoft-graph':
        return <Shield className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading webhook dashboard...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhook Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of ESG data webhooks and automatic updates
          </p>
        </div>
        <Button onClick={refreshData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time webhook count
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.successful || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? Math.round((stats.successful / stats.total) * 100) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? Math.round((stats.failed / stats.total) * 100) : 0}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Sources Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Sources</CardTitle>
          <CardDescription>
            Distribution of webhooks by data source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-500" />
              <span>QuickBooks</span>
              <Badge variant="outline">{stats?.bySource?.quickbooks || 0}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Google Sheets</span>
              <Badge variant="outline">{stats?.bySource?.['google-sheets'] || 0}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <span>Microsoft Graph</span>
              <Badge variant="outline">{stats?.bySource?.['microsoft-graph'] || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="updates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="updates">Recent Updates</TabsTrigger>
          <TabsTrigger value="freshness">Data Freshness</TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Data Updates</CardTitle>
              <CardDescription>
                Latest webhook-triggered data updates and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentUpdates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No data updates yet. Webhooks will appear here when they&apos;re received.
                  </p>
                ) : (
                  recentUpdates.map((update) => (
                    <div key={update.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(update.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            {getSourceIcon(update.source)}
                            <span className="font-medium capitalize">{update.source.replace('-', ' ')}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{update.event_type}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Resource: {update.resource_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(update.status)}
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(update.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="freshness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Freshness</CardTitle>
              <CardDescription>
                Last update times for each data source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataFreshness.map((item) => (
                  <div key={item.source} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getSourceIcon(item.source)}
                      <div>
                        <span className="font-medium capitalize">{item.source.replace('-', ' ')}</span>
                        <p className="text-sm text-muted-foreground">
                          Last event: {item.event_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.status === 'current' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatTimestamp(item.last_update)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Webhook Benefits Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">🚀 Webhook Benefits</CardTitle>
          <CardDescription className="text-blue-700">
            How this webhook system transforms your ESG reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Before Webhooks (Manual Process)</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 280 hours per quarter manually collecting data</li>
                <li>• Manual login to multiple systems</li>
                <li>• Downloading and exporting data</li>
                <li>• Checking for changes since last quarter</li>
                <li>• Manual consolidation and validation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-800 mb-2">With Webhooks (Automated)</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Real-time automatic data updates</li>
                <li>• Instant validation against ESG schemas</li>
                <li>• Unified data consolidation</li>
                <li>• Always-current data throughout quarter</li>
                <li>• 70% time savings on quarterly reporting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
