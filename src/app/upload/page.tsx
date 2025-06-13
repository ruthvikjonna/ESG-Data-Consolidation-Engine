'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Upload Data</h1>
      
      {/* Upload Section */}
      <div className="mb-6 p-4 border rounded">
        <input 
          type="file" 
          onChange={handleFileChange} 
          accept=".csv,.xlsx,.json" 
          className="mb-4" 
        />
        <select 
          value={sourceSystem} 
          onChange={(e) => setSourceSystem(e.target.value)}
          className="mb-4 block w-64 p-2 border rounded"
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        > 
          {uploading ? 'Uploading...' : 'Upload File'} 
        </button>
        {uploadResult && (
          <p className={`mt-2 ${uploadResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {uploadResult}
          </p>
        )}
      </div>

      {/* Data Preview Section */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Data Preview</h2>
          <div className="flex gap-4 items-center">
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All Sources</option>
              {availableSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
            <button 
              onClick={fetchRawData}
              className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {loading && <p>Loading data...</p>}
        {error && <p className="text-red-600">{error}</p>}
        
        {paginatedData.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    {Object.keys(paginatedData[0]).map((header) => (
                      <th 
                        key={header} 
                        className="border px-2 py-2 bg-gray-100 cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort(header)}
                      >
                        <div className="flex items-center gap-1">
                          {header}
                          {sortConfig.key === header && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, i) => (
                    <tr key={i}>
                      {Object.entries(row).map(([key, value]: [string, any], j) => (
                        <td key={j} className="border px-2 py-2">
                          {key === 'ingested_at' 
                            ? new Date(value).toLocaleString()
                            : value?.toString() ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} rows
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
        
        {!loading && !error && rawData.length === 0 && (
          <p className="text-gray-500">No data uploaded yet. Upload a file to see preview.</p>
        )}
      </div>
    </div>
  );
}
