'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Type used to track column and direction for sorting table data
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

export default function UploadPreview() {
  // State variables for file upload and form controls
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  // State for managing ingested raw data
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceSystem, setSourceSystem] = useState<string>('manual_upload');

  // Pagination and filtering controls
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  // Sorting configuration for table display
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'ingested_at', direction: 'desc' });

  const router = useRouter();
  const tableRef = useRef<HTMLDivElement>(null);

  // When a file is selected in the input, update state
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Handles file upload via API
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
        fetchAvailableSources(); // Refresh source filter list
      } else {
        setUploadResult(`Error: ${data.error || "Unknown error."}`);
      }
    } catch (err: any) {
      setUploadResult(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Fetch distinct source systems from the ingested data
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

  // Retrieve ingested raw data for current user and selected filter
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

  // Fetch data when the source filter changes
  useEffect(() => {
    fetchRawData();
    fetchAvailableSources();
  }, [selectedSourceFilter]);

  // Sorts table data based on user-selected column and direction
  const sortedData = [...rawData].sort((a, b) => {
    if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;
    const aValue = a[sortConfig.key].toString().toLowerCase();
    const bValue = b[sortConfig.key].toString().toLowerCase();
    return sortConfig.direction === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
  });

  // Calculate and slice the current page's data
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Toggle sorting when column headers are clicked
  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sign out user and redirect
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Scroll table into view on page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  // Render UI
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#18181B]">Bloom ESG</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-[#18181B] border border-[#E5E7EB] rounded px-4 py-2 transition-colors duration-150 bg-[#F3F4F6] hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Upload and Data Preview */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#18181B]">Upload Data</h2>

          {/* Upload Controls */}
          <div className="mb-10 p-6 border border-[#E5E7EB] rounded-lg bg-[#F8FAFC] flex flex-col md:flex-row md:items-end gap-6">
            <label className="block w-full md:w-auto">
              <span className="sr-only">Choose File</span>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".csv,.xlsx,.json"
                className="block w-full text-sm text-[#18181B] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#F3F4F6] file:text-[#18181B] hover:file:bg-[#E5E7EB] focus:file:bg-[#E5E7EB] transition-colors duration-150"
              />
            </label>
            <select value={sourceSystem} onChange={(e) => setSourceSystem(e.target.value)} className="w-64 p-2 border border-[#E5E7EB] rounded bg-white text-[#18181B]">
              <option value="manual_upload">Manual Upload</option>
              <option value="workday">Workday</option>
              <option value="quickbooks">QuickBooks</option>
              <option value="sap">SAP</option>
              <option value="excel">Excel</option>
            </select>
            <button onClick={handleUpload} disabled={!file || uploading} className="bg-[#2563EB] text-white px-6 py-2 rounded font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors duration-150">
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
            {uploadResult && <p className={`mt-2 font-semibold ${uploadResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{uploadResult}</p>}
          </div>

          {/* Filter and Preview */}
          <div ref={tableRef} className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg p-6 mt-2">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-[#18181B] mb-2 md:mb-0">Data Preview</h2>
              <div className="flex gap-3 items-center">
                <select value={selectedSourceFilter} onChange={(e) => setSelectedSourceFilter(e.target.value)} className="p-2 border border-[#E5E7EB] rounded bg-white text-[#18181B]">
                  <option value="all">All Sources</option>
                  {availableSources.map(source => <option key={source} value={source}>{source}</option>)}
                </select>
                <button onClick={fetchRawData} className="px-5 py-2 bg-[#2563EB] text-white text-base font-bold rounded hover:bg-[#1D4ED8] border border-[#2563EB] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
                  Refresh
                </button>
              </div>
            </div>

            {loading && <p className="text-[#18181B] font-semibold">Loading data...</p>}
            {error && <p className="text-red-600 font-semibold">{error}</p>}

            {paginatedData.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                  <table className="min-w-full text-sm bg-white">
                    <thead className="bg-[#F3F4F6]">
                      <tr>
                        {Object.keys(paginatedData[0] || {}).map((key) => (
                          <th key={key} className="border-b border-[#E5E7EB] px-4 py-3 text-left font-bold text-[#18181B] cursor-pointer select-none hover:bg-[#E5E7EB] transition-colors duration-150" onClick={() => handleSort(key)}>
                            {key}
                            {sortConfig.key === key && <span className="ml-1 text-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((row, i) => (
                        <tr key={i} className="hover:bg-[#F8FAFC] transition-colors duration-150">
                          {Object.values(row).map((value, j) => (
                            <td key={j} className="px-4 py-3 text-[#18181B] border-b border-[#E5E7EB]">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="mt-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 px-2 pb-2">
                  <div className="text-sm text-[#18181B] pl-1">
                    Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} rows
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-4 py-2 border border-[#E5E7EB] rounded bg-[#F3F4F6] text-[#18181B] hover:bg-[#E5E7EB] disabled:opacity-50 transition-colors duration-150">
                      Previous
                    </button>
                    <span className="px-4 py-2 text-[#18181B] bg-[#F8FAFC] rounded">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-4 py-2 border border-[#E5E7EB] rounded bg-[#F3F4F6] text-[#18181B] hover:bg-[#E5E7EB] disabled:opacity-50 transition-colors duration-150">
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
            {!loading && !error && rawData.length === 0 && (
              <p className="text-[#6b7280] font-semibold">No data uploaded yet. Upload a file to see preview.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
