'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

export default function UploadPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceSystem, setSourceSystem] = useState<string>('manual_upload');
  
  // New state for pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'ingested_at', direction: 'desc' });

  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const session = (await supabase.auth.getSession()).data.session;
    const accessToken = session?.access_token;
    const user_id = session?.user?.id;
    if (!user_id) {
      setUploadResult("User not authenticated.");
      setUploading(false);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", user_id);
    formData.append("source_system", sourceSystem);
    try {
      const res = await fetch("/api/ingest", { 
        method: "POST", 
        body: formData, 
        headers: { Authorization: `Bearer ${accessToken}` } 
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult(`Ingest complete: ${data.count} rows.`);
        fetchRawData();
        fetchAvailableSources(); // Refresh available sources after upload
      } else {
        setUploadResult(`Error: ${data.error || "Unknown error."}`);
      }
    } catch (err: any) {
      setUploadResult(`Error: ${err.message}`);
    } finally { 
      setUploading(false); 
    }
  };

  const fetchAvailableSources = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const user_id = session?.user?.id;
      if (!user_id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('raw_data')
        .select('source_system')
        .eq('user_id', user_id)
        .order('source_system');

      if (error) throw error;
      const sources = [...new Set(data.map(row => row.source_system))];
      setAvailableSources(sources);
    } catch (err: any) {
      console.error('Error fetching sources:', err);
    }
  };

  const fetchRawData = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const user_id = session?.user?.id;
      if (!user_id) throw new Error("Not authenticated");

      let query = supabase
        .from('raw_data')
        .select('raw_data, source_system, ingested_at')
        .eq('user_id', user_id)
        .order('ingested_at', { ascending: false });

      if (selectedSourceFilter !== 'all') {
        query = query.eq('source_system', selectedSourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRawData(data.map(row => ({ ...row.raw_data, ingested_at: row.ingested_at })));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRawData();
    fetchAvailableSources();
  }, [selectedSourceFilter]); // Refetch when source filter changes

  // Sorting function
  const sortedData = [...rawData].sort((a, b) => {
    if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;
    
    const aValue = a[sortConfig.key].toString().toLowerCase();
    const bValue = b[sortConfig.key].toString().toLowerCase();
    
    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Bloom ESG</h1>
            <button
              onClick={handleSignOut}
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold px-4 py-2 border border-blue-600 rounded transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Upload Data</h2>
          
          {/* Upload Section */}
          <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50">
            <input 
              type="file" 
              onChange={handleFileChange} 
              accept=".csv,.xlsx,.json" 
              className="mb-4 block w-full text-sm text-gray-700
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <select 
              value={sourceSystem} 
              onChange={(e) => setSourceSystem(e.target.value)}
              className="mb-4 block w-64 p-2 border border-gray-300 rounded bg-white text-gray-900"
            >
              <option value="manual_upload">Manual Upload</option>
              <option value="workday">Workday</option>
              <option value="quickbooks">QuickBooks</option>
              <option value="sap">SAP</option>
              <option value="excel">Excel</option>
            </select>
            <button 
              onClick={handleUpload} 
              disabled={!file || uploading} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
            > 
              {uploading ? 'Uploading...' : 'Upload File'} 
            </button>
            {uploadResult && (
              <p className={`mt-2 ${uploadResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'} font-semibold`}>
                {uploadResult}
              </p>
            )}
          </div>

          {/* Data Preview Section */}
          <div className="bg-white rounded-lg border border-gray-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Data Preview</h2>
              <div className="flex gap-4 items-center">
                <select
                  value={selectedSourceFilter}
                  onChange={(e) => setSelectedSourceFilter(e.target.value)}
                  className="p-2 border border-gray-300 rounded bg-white text-gray-900"
                >
                  <option value="all">All Sources</option>
                  {availableSources.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
                <button 
                  onClick={fetchRawData}
                  className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 text-sm font-semibold border border-gray-300"
                >
                  Refresh
                </button>
              </div>
            </div>
            
            {loading && <p className="text-gray-700 font-semibold">Loading data...</p>}
            {error && <p className="text-red-600 font-semibold">{error}</p>}
            
            {paginatedData.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300 text-sm bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(paginatedData[0] || {}).map((key) => (
                          <th
                            key={key}
                            className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-900 cursor-pointer select-none"
                            onClick={() => handleSort(key)}
                          >
                            {key}
                            {sortConfig.key === key && (
                              <span className="ml-1 text-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((value, j) => (
                            <td key={j} className="border border-gray-300 px-3 py-2 text-gray-800">
                              {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} rows
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 bg-white text-gray-900"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-gray-900">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 bg-white text-gray-900"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {!loading && !error && rawData.length === 0 && (
              <p className="text-gray-500 font-semibold">No data uploaded yet. Upload a file to see preview.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
