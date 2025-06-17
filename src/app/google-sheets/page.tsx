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
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                  Connect with Google Sheets
                </a>
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
          
          {/* Data Operations Section */}
          {accessToken && (
            <div className="p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Select and Import Data
              </h2>
          
              <div className="mt-6 space-y-6">
                <div className="relative">
                  <label className="block mb-2 text-sm font-medium text-gray-700">Search and Select a Spreadsheet</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
                      placeholder="Type to search your spreadsheets..."
                      disabled={loadingSpreadsheets || spreadsheets.length === 0}
                    />
                    {loadingSpreadsheets && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {searchTerm && spreadsheets.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-200">
                      <ul className="py-1">
                        {spreadsheets
                          .filter(sheet => 
                            sheet.name.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map(sheet => (
                            <li 
                              key={sheet.id} 
                              className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-gray-900 text-sm"
                              onClick={() => {
                                setSpreadsheetId(sheet.id);
                                setSearchTerm(sheet.name);
                              }}
                            >
                              <div className="flex items-center">
                                <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm4-1a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                {sheet.name}
                              </div>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {spreadsheetId && (
                  <div className="rounded-md bg-blue-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1 md:flex md:justify-between">
                        <p className="text-sm text-blue-700">Selected: <span className="font-medium">{searchTerm}</span></p>
                        <p className="mt-1 text-xs text-blue-500 md:mt-0 md:ml-6">ID: {spreadsheetId}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <button
                    onClick={handleGetData}
                    disabled={loading || !spreadsheetId}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Fetching...
                      </>
                    ) : 'Fetch Data'}
                  </button>
                </div>
              </div>
              
              {/* Data Display */}
              {data.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Spreadsheet Data</h3>
                  <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {data[0] && data[0].map((header, index) => (
                              <th 
                                key={index} 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      onClick={handleSaveData}
                      disabled={loading || data.length === 0}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : 'Save Data to Database'}
                    </button>
                  </div>
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