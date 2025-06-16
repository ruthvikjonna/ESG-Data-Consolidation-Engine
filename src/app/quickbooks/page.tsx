'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type DataType = 'company' | 'customers' | 'invoices' | 'bills' | 'purchases' | 'accounts';

export default function QuickBooksPage() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [selectedDataType, setSelectedDataType] = useState<DataType>('invoices');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  
  const router = useRouter();

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) router.push('/sign-in');
    });
  }, [router]);

  // Check if QuickBooks is already connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if the qb_connected cookie exists and has the correct value
        const cookieString = document.cookie;
        const cookies = cookieString.split(';').map(cookie => cookie.trim());
        const qbConnectedCookie = cookies.find(cookie => cookie.startsWith('qb_connected='));
        
        // Initial check based on cookie
        const cookieConnected = qbConnectedCookie === 'qb_connected=true';
        
        if (cookieConnected) {
          // Verify the connection by making a test API call
          try {
            const response = await fetch('/api/quickbooks/data?type=company', { 
              method: 'HEAD',
              headers: { 'X-Connection-Test': 'true' } 
            });
            
            // If the response is successful, the connection is valid
            if (response.ok) {
              setIsConnected(true);
              setMessage('QuickBooks is connected! You can now fetch data.');
            } else {
              // Connection is not valid despite the cookie
              setIsConnected(false);
              setError('QuickBooks connection expired. Please reconnect.');
            }
          } catch (apiError) {
            // API call failed, connection is not valid
            console.error('Error verifying QuickBooks connection:', apiError);
            setIsConnected(false);
            setError('Unable to verify QuickBooks connection. Please reconnect.');
          }
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error checking QuickBooks connection:', error);
        setIsConnected(false);
      }
    };
    
    checkConnection();
  }, []);

  // Handle connecting to QuickBooks
  const handleConnect = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Redirect to the QuickBooks auth endpoint
      window.location.href = '/api/quickbooks/auth';
    } catch (error: any) {
      console.error('Error connecting to QuickBooks:', error);
      setError('Failed to connect to QuickBooks');
      setLoading(false);
    }
  };
  
  // Handle disconnecting from QuickBooks
  const handleDisconnect = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await fetch('/api/quickbooks/disconnect');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect');
      }
      
      // Reset state
      setIsConnected(false);
      setData(null);
      setMessage('Successfully disconnected from QuickBooks');
    } catch (error: any) {
      console.error('Error disconnecting from QuickBooks:', error);
      setError(error.message || 'Failed to disconnect from QuickBooks');
    } finally {
      setLoading(false);
    }
  };

  // Handle fetching data from QuickBooks
  const handleGetData = async () => {
    if (!isConnected) {
      setError('Please connect to QuickBooks first');
      return;
    }
    
    setLoading(true);
    setError('');
    setData(null);
    
    try {
      const response = await fetch(`/api/quickbooks/data?type=${selectedDataType}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }
      
      const result = await response.json();
      setData(result.data);
      setMessage(`Successfully fetched ${selectedDataType} data`);
    } catch (error: any) {
      console.error('Error fetching QuickBooks data:', error);
      setError(error.message || 'Failed to fetch QuickBooks data');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Handle saving data to database with authentication
  const handleSaveData = async () => {
    if (!data) {
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
      
      console.log('Saving data type:', selectedDataType);
      console.log('Data structure:', Object.keys(data));
      
      // Use the API endpoint to save data as individual entries
      const response = await fetch('/api/quickbooks/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // ✅ Add auth header
        },
        body: JSON.stringify({
          dataType: selectedDataType,
          data: data
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save data');
      }
      
      const result = await response.json();
      console.log('Save response:', result);
      setMessage(result.message || 'Data saved to database successfully!');
    } catch (error: any) {
      console.error('Error saving data to database:', error);
      setError(error.message || 'Failed to save data to database');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#18181B]">Bloom ESG – QuickBooks</h1>
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
            QuickBooks Integration
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Connect to your QuickBooks account and import financial data
          </p>
        </div>

        {/* Authentication Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              QuickBooks Authentication
            </h2>
          </div>
          <div className="p-6">
            {!isConnected ? (
              <div className="mt-4">
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200 disabled:bg-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                  Connect with QuickBooks
                </button>
                <p className="mt-3 text-sm text-gray-500">
                  Click the button above to authorize access to your QuickBooks account. You'll be redirected back automatically after authentication.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-emerald-800">Successfully connected to QuickBooks</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414a1 1 0 00-.293-.707L11.414 2.414A1 1 0 0010.707 2H4a1 1 0 00-1 1zm9 2.5V5a.5.5 0 01.5-.5h.5a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5h-.5a.5.5 0 01-.5-.5zm-3 0V5a.5.5 0 01.5-.5h.5a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5h-.5a.5.5 0 01-.5-.5zm-3 0V5a.5.5 0 01.5-.5h.5a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5h-.5a.5.5 0 01-.5-.5z" clipRule="evenodd" />
                    <path d="M3 9h10v1H3v-1zm0 2h10v1H3v-1z" />
                  </svg>
                  Disconnect QuickBooks
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Operations Section */}
        {isConnected && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Select and Import Data
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Type</label>
                <select
                  value={selectedDataType}
                  onChange={(e) => setSelectedDataType(e.target.value as DataType)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="company">Company Info</option>
                  <option value="customers">Customers</option>
                  <option value="invoices">Invoices</option>
                  <option value="bills">Bills</option>
                  <option value="purchases">Purchases</option>
                  <option value="accounts">Accounts</option>
                </select>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleGetData}
                  disabled={loading}
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

              {/* Data Display */}
              {data && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">QuickBooks Data</h3>
                  <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <div className="overflow-x-auto">
                      <pre className="p-4 text-sm text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      onClick={handleSaveData}
                      disabled={loading || !data}
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
          </div>
        )}
        
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