'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Spreadsheet = {
  id: string;
  name: string;
};

export default function GoogleSheetsPage() {
  const [authUrl, setAuthUrl] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [data, setData] = useState<any[][]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [spreadsheets, setSpreadsheets] = useState<{id: string; name: string}[]>([]);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const router = useRouter();

  // Generate authentication URL when the page loads and check for successful auth
  useEffect(() => {
    // Get the authorization URL when the component mounts
    const getAuthUrl = async () => {
      try {
        const response = await fetch('/api/auth?service=google');
        const data = await response.json();
        setAuthUrl(data.authUrl);
      } catch (error) {
        console.error('Error fetching auth URL:', error);
        setError('Failed to get authorization URL');
      }
    };

    getAuthUrl();

    // Check if we have a successful auth response in URL
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    
    if (authStatus === 'success') {
      setMessage('Authentication successful! You can now fetch spreadsheet data.');
      // Fetch the access token
      fetchToken();
    }
  }, []);
  
  // Fetch the access token
  const fetchToken = async () => {
    try {
              const response = await fetch('/api/auth?service=google&requestToken=true');
      const data = await response.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        // Once we have the token, fetch the spreadsheets
        fetchSpreadsheets(data.accessToken);
      }
    } catch (error) {
      console.error('Error fetching token:', error);
      setError('Failed to get access token');
    }
  };
  
  // Fetch the user's spreadsheets
  const fetchSpreadsheets = async (token: string) => {
    setLoadingSpreadsheets(true);
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
      setLoadingSpreadsheets(false);
    }
  };

  // Fetch data from spreadsheet
  const handleGetData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !spreadsheetId) return;
    
    setLoading(true);
    setError('');
    setData([]);
    
    try {
              const response = await fetch(`/api/data?service=google&access_token=${accessToken}&spreadsheet_id=${spreadsheetId}`);
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

  // ✅ FIXED: Save data with authentication
  const handleSaveData = async () => {
    if (data.length === 0) {
      setError('No data to save');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Get the current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('You must be logged in to save data');
        return;
      }
      
      // Use default sheet name since we're fetching the entire spreadsheet
      const sheetName = "Sheet1";
      
              const response = await fetch('/api/save?service=google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // ✅ Add auth header
        },
        body: JSON.stringify({
          sheetData: data,
          spreadsheetId,
          sheetName
        }),
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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#18181B]">Bloom ESG – Google Sheets</h1>
          <button
            onClick={() => {
              router.push('/');
            }}
            className="text-sm text-[#18181B] border border-[#E5E7EB] rounded px-4 py-2 transition-colors duration-150 bg-[#F3F4F6] hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            Back to Dashboard
          </button>
        </div>
      </header>
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Google Sheets Integration
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Import your spreadsheet data into the ESG Data Infrastructure Platform
          </p>
        </div>
        
        {/* Card Container */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Authentication Section */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Authentication
            </h2>
            
            {!accessToken ? (
              <div className="mt-4">
                <button
                  onClick={() => {
                    if (authUrl) window.location.href = authUrl;
                  }}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                  Connect with Google Sheets
                </button>
                <p className="mt-3 text-sm text-gray-500">
                  Click the button above to authorize access to your Google Sheets. You'll be redirected back automatically after authentication.
                </p>
              </div>
            ) : (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-emerald-800">Successfully connected to Google Sheets</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Spreadsheet Selection & Preview Section */}
          {accessToken && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Select a Spreadsheet</h3>
              {loadingSpreadsheets ? (
                <div className="text-gray-500">Loading spreadsheets...</div>
              ) : error ? (
                <div className="text-red-600">{error}</div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="mb-3 px-3 py-2 border rounded w-full"
                  />
                  <div className="max-h-48 overflow-y-auto border rounded mb-4">
                    {spreadsheets
                      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(s => (
                        <div
                          key={s.id}
                          className={`px-4 py-2 cursor-pointer hover:bg-emerald-50 ${spreadsheetId === s.id ? 'bg-emerald-100 font-semibold' : ''}`}
                          onClick={() => setSpreadsheetId(s.id)}
                        >
                          {s.name}
                        </div>
                      ))}
                    {spreadsheets.length === 0 && (
                      <div className="px-4 py-2 text-gray-500">No spreadsheets found.</div>
                    )}
                  </div>
                  {spreadsheetId && (
                    <form onSubmit={handleGetData} className="mb-4">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                        disabled={loading}
                      >
                        {loading ? 'Fetching Data...' : 'Preview Data'}
                      </button>
                    </form>
                  )}
                </>
              )}

              {/* Data Preview Section */}
              {data.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Data Preview (first 10 rows)</h4>
                  <div className="overflow-x-auto border rounded">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          {data[0].map((cell: any, idx: number) => (
                            <th key={idx} className="px-3 py-2 font-semibold text-left border-b">{cell}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.slice(1, 11).map((row: any[], rowIdx: number) => (
                          <tr key={rowIdx} className="border-b">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="px-3 py-2">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={handleSaveData}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'Importing...' : 'Import to Bloom'}
                  </button>
                  {message && (
                    <div className="mt-2 text-emerald-700">{message}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Status Messages */}
        {(error || message) && (
          <div className="mt-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {message && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}