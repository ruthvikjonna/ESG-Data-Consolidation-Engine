'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Papa, { ParseResult } from "papaparse";
import * as XLSX from "xlsx";

type Service = 'excel' | 'google' | 'quickbooks' | 'manual';
type DataType = 'company' | 'customers' | 'invoices' | 'bills' | 'purchases' | 'accounts';

interface ServiceConfig {
  name: string;
  description: string;
  authRequired: boolean;
  dataTypes?: DataType[];
}

const SERVICE_CONFIGS: Record<Service, ServiceConfig> = {
  excel: {
    name: 'Microsoft Excel',
    description: 'Import data from Excel files stored in OneDrive',
    authRequired: true
  },
  google: {
    name: 'Google Sheets',
    description: 'Import data from Google Sheets',
    authRequired: true
  },
  quickbooks: {
    name: 'QuickBooks',
    description: 'Import financial data from QuickBooks',
    authRequired: true,
    dataTypes: ['company', 'customers', 'invoices', 'bills', 'purchases', 'accounts']
  },
  manual: {
    name: 'Manual Upload',
    description: 'Upload CSV, Excel, or JSON files directly',
    authRequired: false
  }
};

function objectsToTable(dataArray: any[]): any[][] {
  if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
  const headers = Object.keys(dataArray[0]);
  const rows = dataArray.map(obj => headers.map(h => obj[h]));
  return [headers, ...rows];
}

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const service = (searchParams.get('service') as Service) || 'excel';
  
  // Common state
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [data, setData] = useState<any[][]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Service-specific state
  const [authUrl, setAuthUrl] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedDataType, setSelectedDataType] = useState<DataType>('invoices');
  const [spreadsheets, setSpreadsheets] = useState<{id: string; name: string}[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<string>('');
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [files, setFiles] = useState<{id: string; name: string}[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [quickbooksRawData, setQuickbooksRawData] = useState<any>(null);

  const config = SERVICE_CONFIGS[service];

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid integration service</h1>
          <p className="text-gray-600">Please select a valid integration from the dashboard.</p>
        </div>
      </div>
    );
  }

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user && config.authRequired) {
        router.push('/auth');
      }
    });
  }, [router, config.authRequired]);

  // Initialize service-specific logic
  useEffect(() => {
    if (!user && config.authRequired) return;
    
    switch (service) {
      case 'excel':
        initializeExcel();
        break;
      case 'google':
        initializeGoogle();
        break;
      case 'quickbooks':
        initializeQuickBooks();
        break;
      case 'manual':
        // No initialization needed
        break;
    }
  }, [service, user]);

  // Excel initialization
  const initializeExcel = async () => {
    try {
      const response = await fetch('/api/auth?service=excel');
      const data = await response.json();
      setAuthUrl(data.authUrl);
      
      // Check if already authenticated
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auth') === 'success') {
        setMessage('Authentication successful! You can now fetch Excel files.');
        fetchExcelToken();
      }
    } catch (error) {
      console.error('Error initializing Excel:', error);
      setError('Failed to initialize Excel integration');
    }
  };

  // Google initialization
  const initializeGoogle = async () => {
    try {
      const response = await fetch('/api/auth?service=google');
      const data = await response.json();
      setAuthUrl(data.authUrl);
      
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auth') === 'success') {
        setMessage('Authentication successful! You can now fetch spreadsheets.');
        fetchGoogleToken();
      }
    } catch (error) {
      console.error('Error initializing Google:', error);
      setError('Failed to initialize Google Sheets integration');
    }
  };

  // QuickBooks initialization
  const initializeQuickBooks = async () => {
    setLoading(true);
    try {
      // First, get the auth URL for the Connect button
      const authResponse = await fetch('/api/auth?service=quickbooks');
      const authData = await authResponse.json();
      setAuthUrl(authData.authUrl);
      
      // Then check if already connected
      const cookieString = document.cookie;
      const cookies = cookieString.split(';').map(cookie => cookie.trim());
      const qbConnectedCookie = cookies.find(cookie => cookie.startsWith('qb_connected='));
      
      if (qbConnectedCookie === 'qb_connected=true') {
        try {
          const response = await fetch('/api/data?service=quickbooks&type=company', { 
            method: 'HEAD',
            headers: { 'X-Connection-Test': 'true' } 
          });
          
          if (response.ok) {
            setIsConnected(true);
            setMessage('QuickBooks is connected! You can now fetch data.');
          } else {
            setIsConnected(false);
            setError('QuickBooks connection expired. Please reconnect.');
            // Clear the qb_connected cookie if the test fails
            document.cookie = 'qb_connected=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        } catch (apiError) {
          setIsConnected(false);
          setError('Unable to verify QuickBooks connection. Please reconnect.');
          document.cookie = 'qb_connected=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error initializing QuickBooks:', error);
      setError('Failed to initialize QuickBooks integration');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Token fetching functions
  const fetchExcelToken = async () => {
    try {
      const response = await fetch('/api/auth?service=excel&requestToken=true');
      const data = await response.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        fetchExcelFiles(data.accessToken);
      }
    } catch (error) {
      console.error('Error fetching Excel token:', error);
      setError('Failed to get access token');
    }
  };

  const fetchGoogleToken = async () => {
    try {
      const response = await fetch('/api/auth?service=google&requestToken=true');
      const data = await response.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        fetchGoogleSpreadsheets(data.accessToken);
      }
    } catch (error) {
      console.error('Error fetching Google token:', error);
      setError('Failed to get access token');
    }
  };

  // File/Spreadsheet fetching functions
  const fetchExcelFiles = async (token: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/list?service=excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: token }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else if (result.files) {
        setFiles(result.files);
      }
    } catch (error: any) {
      console.error('Error fetching Excel files:', error);
      setError(error.message || 'Failed to fetch Excel files');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleSpreadsheets = async (token: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/list?service=google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: token }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else if (result.spreadsheets) {
        setSpreadsheets(result.spreadsheets);
      }
    } catch (error: any) {
      console.error('Error fetching spreadsheets:', error);
      setError(error.message || 'Failed to fetch spreadsheets');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection for Excel
  const handleExcelFileSelect = async () => {
    if (!selectedFile || !accessToken) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/data?service=excel&access_token=${accessToken}&file_id=${selectedFile}`);
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else if (result.sheets) {
        setSheets(result.sheets);
        setMessage(`Found ${result.sheets.length} sheets in the selected file`);
      }
    } catch (error: any) {
      console.error('Error fetching Excel sheets:', error);
      setError(error.message || 'Failed to fetch Excel sheets');
    } finally {
      setLoading(false);
    }
  };

  // Handle spreadsheet selection for Google
  const handleGoogleSpreadsheetSelect = async () => {
    if (!selectedSpreadsheet || !accessToken) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/data?service=google&access_token=${accessToken}&spreadsheet_id=${selectedSpreadsheet}`);
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else if (result.values) {
        setData(result.values);
        setMessage(`Successfully fetched ${result.values.length} rows of data`);
      }
    } catch (error: any) {
      console.error('Error fetching spreadsheet data:', error);
      setError(error.message || 'Failed to fetch spreadsheet data');
    } finally {
      setLoading(false);
    }
  };

  // Handle sheet selection for Excel
  const handleExcelSheetSelect = async () => {
    if (!selectedFile || !selectedSheet || !accessToken) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/data?service=excel&access_token=${accessToken}&file_id=${selectedFile}&sheet_name=${selectedSheet}`);
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else if (result.values) {
        setData(result.values);
        setMessage(`Successfully fetched ${result.values.length} rows of data`);
      }
    } catch (error: any) {
      console.error('Error fetching Excel data:', error);
      setError(error.message || 'Failed to fetch Excel data');
    } finally {
      setLoading(false);
    }
  };

  // Handle QuickBooks data fetching
  const handleQuickBooksDataFetch = async () => {
    if (!isConnected) {
      setError('Please connect to QuickBooks first');
      return;
    }
    
    setLoading(true);
    setError('');
    setData([]);
    setQuickbooksRawData(null);
    
    try {
      const response = await fetch(`/api/data?service=quickbooks&type=${selectedDataType}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }
      
      const result = await response.json();
      console.log('QuickBooks API response:', result);
      
      if (result.data) {
        setQuickbooksRawData(result.data);
        setMessage('QuickBooks data loaded.');
      } else {
        setMessage(`No data returned for ${selectedDataType}`);
      }
    } catch (error: any) {
      console.error('Error fetching QuickBooks data:', error);
      setError(error.message || 'Failed to fetch QuickBooks data');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual file upload
  const handleManualFileUpload = (file: File) => {
    setFile(file);
    setError('');
    setMessage('');
    setLoading(true);
    
    const ext = file.name.split(".").pop()?.toLowerCase();
    
    if (ext === "csv") {
      Papa.parse<File>(file, {
        complete: (results: ParseResult<any>) => {
          setData(results.data as any[][]);
          setLoading(false);
        },
        error: (error: Error) => {
          setError(error.message);
          setLoading(false);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const ab = e.target?.result;
        const wb = XLSX.read(ab, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
        setData(json as any[][]);
        setLoading(false);
      };
      reader.onerror = () => {
        setError("Failed to read Excel file.");
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (Array.isArray(json) && json.length > 0 && typeof json[0] === "object") {
            const keys = Object.keys(json[0]);
            const rows = [keys, ...json.map((row: any) => keys.map((k) => row[k]))];
            setData(rows);
          } else {
            setError("JSON must be an array of objects.");
          }
        } catch (err: any) {
          setError(err.message);
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setError("Failed to read JSON file.");
        setLoading(false);
      };
      reader.readAsText(file);
    } else {
      setError("Unsupported file type.");
      setLoading(false);
    }
  };

  // Handle authentication
  const handleAuth = () => {
    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
  };

  // Handle disconnection
  const handleDisconnect = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await fetch(`/api/disconnect?service=${service}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect');
      }
      
      setIsConnected(false);
      setData([]);
      setMessage('Successfully disconnected');
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      setError(error.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  // Handle data saving
  const handleSaveData = async () => {
    // For QuickBooks, check quickbooksRawData; for others, check data.length
    if ((service === 'quickbooks' && !quickbooksRawData) || (service !== 'quickbooks' && data.length === 0)) {
      setError('No data to save');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to save data');
        return;
      }
      
      let requestBody: any = {};
      
      switch (service) {
        case 'excel':
          requestBody = {
            sheetData: data,
            fileId: selectedFile,
            sheetName: selectedSheet
          };
          break;
        case 'google':
          requestBody = {
            sheetData: data,
            spreadsheetId: selectedSpreadsheet,
            sheetName: "Sheet1"
          };
          break;
        case 'quickbooks':
          requestBody = {
            dataType: selectedDataType,
            data: quickbooksRawData // Use the raw JSON data
          };
          break;
        case 'manual':
          const rows = data.slice(1).map((row: any[]) => {
            const obj: Record<string, any> = {};
            (data[0] as string[]).forEach((h: string, i: number) => {
              obj[h] = row[i];
            });
            return obj;
          });
          requestBody = {
            sheetData: rows,
            source: 'manual_upload'
          };
          break;
      }
      
      const response = await fetch(`/api/save?service=${service}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(result.message || 'Data saved to database successfully!');
      }
    } catch (error: any) {
      console.error('Error saving data to database:', error);
      setError(error.message || 'Failed to save data to database');
    } finally {
      setLoading(false);
    }
  };

  if (!user && config.authRequired) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#18181B]">Bloom ESG – {config.name}</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-[#18181B] border border-[#E5E7EB] rounded px-4 py-2 transition-colors duration-150 bg-[#F3F4F6] hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              Back to Dashboard
            </button>
            {user && (
              <button
                onClick={() => {
                  supabase.auth.signOut();
                  router.push('/auth');
                }}
                className="text-sm text-[#18181B] border border-[#E5E7EB] rounded px-4 py-2 transition-colors duration-150 bg-[#F3F4F6] hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {config.name} Integration
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            {config.description}
          </p>
        </div>

        {/* Error/Message Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {message}
          </div>
        )}

        {/* Authentication Section */}
        {config.authRequired && !isConnected && !accessToken && (
          <div className="bg-white rounded-xl shadow p-8 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#18181B]">Connect to {config.name}</h2>
            <p className="text-gray-600 mb-6">
              You need to authenticate with {config.name} to access your data.
            </p>
            <button
              onClick={handleAuth}
              disabled={loading}
              className="bg-[#2563EB] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors duration-150"
            >
              {loading ? 'Connecting...' : `Connect to ${config.name}`}
            </button>
          </div>
        )}

        {/* Disconnect Section */}
        {(isConnected || accessToken) && (
          <div className="bg-white rounded-xl shadow p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[#18181B]">Connected to {config.name}</h2>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="text-red-600 border border-red-200 rounded px-4 py-2 hover:bg-red-50 transition-colors duration-150"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Data Selection Section */}
        {(isConnected || accessToken || service === 'manual') && (
          <div className="bg-white rounded-xl shadow p-8 mb-8">
            <h2 className="text-xl font-semibold mb-6 text-[#18181B]">Select Data</h2>
            
            {/* QuickBooks Data Type Selection */}
            {service === 'quickbooks' && config.dataTypes && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Type
                </label>
                <select
                  value={selectedDataType}
                  onChange={(e) => setSelectedDataType(e.target.value as DataType)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                >
                  {config.dataTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleQuickBooksDataFetch}
                  disabled={loading}
                  className="mt-4 bg-[#2563EB] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors duration-150"
                >
                  {loading ? 'Fetching...' : 'Fetch Data'}
                </button>
              </div>
            )}

            {/* Excel File Selection */}
            {service === 'excel' && accessToken && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel File
                </label>
                <select
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                >
                  <option value="">Choose a file...</option>
                  {files.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleExcelFileSelect}
                  disabled={!selectedFile || loading}
                  className="mt-4 bg-[#2563EB] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors duration-150"
                >
                  {loading ? 'Loading...' : 'Load File'}
                </button>
              </div>
            )}

            {/* Excel Sheet Selection */}
            {service === 'excel' && sheets.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Sheet
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                >
                  <option value="">Choose a sheet...</option>
                  {sheets.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleExcelSheetSelect}
                  disabled={!selectedSheet || loading}
                  className="mt-4 bg-[#2563EB] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors duration-150"
                >
                  {loading ? 'Loading...' : 'Load Sheet'}
                </button>
              </div>
            )}

            {/* Google Spreadsheet Selection */}
            {service === 'google' && accessToken && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Spreadsheet
                </label>
                <select
                  value={selectedSpreadsheet}
                  onChange={(e) => setSelectedSpreadsheet(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                >
                  <option value="">Choose a spreadsheet...</option>
                  {spreadsheets.map((spreadsheet) => (
                    <option key={spreadsheet.id} value={spreadsheet.id}>
                      {spreadsheet.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleGoogleSpreadsheetSelect}
                  disabled={!selectedSpreadsheet || loading}
                  className="mt-4 bg-[#2563EB] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors duration-150"
                >
                  {loading ? 'Loading...' : 'Load Spreadsheet'}
                </button>
              </div>
            )}

            {/* Manual File Upload */}
            {service === 'manual' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File (.csv, .xlsx, .xls, .json)
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleManualFileUpload(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#2563EB] file:text-white hover:file:bg-[#1D4ED8]"
                />
              </div>
            )}
          </div>
        )}

        {/* Data Preview */}
        {service === 'quickbooks' && quickbooksRawData && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6 overflow-x-auto">
            <h3 className="font-semibold mb-2">QuickBooks Data Preview (JSON)</h3>
            <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(quickbooksRawData, null, 2)}</pre>
          </div>
        )}

        {service !== 'quickbooks' && data.length > 0 && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6 overflow-x-auto">
            <h3 className="font-semibold mb-2">Data Preview</h3>
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  {data[0].map((header: string, idx: number) => (
                    <th key={idx} className="px-2 py-1 border-b font-bold text-left">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(1).map((row: any[], rowIdx: number) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-2 py-1 border-b">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {((service === 'quickbooks' && quickbooksRawData) || (service !== 'quickbooks' && data.length > 0)) && (
          <div className="flex justify-end mb-8">
            <button
              onClick={handleSaveData}
              disabled={loading || (service === 'quickbooks' ? !quickbooksRawData : data.length === 0)}
              className="bg-[#22C55E] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#16A34A] disabled:opacity-50 transition-colors duration-150"
            >
              {loading ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 