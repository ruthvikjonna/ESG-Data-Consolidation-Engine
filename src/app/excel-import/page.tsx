"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ExcelImport() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ id: string; name: string }[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const router = useRouter();

  // Auth check and admin check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      // For now, treat the first user as admin (replace with real role check)
      setIsAdmin(!!data.user);
      if (!data.user) router.push("/");
    });
  }, [router]);

  // Step 1: Fetch Excel files
  useEffect(() => {
    if (step === 1 && isAdmin) {
      setLoading(true);
      fetch("/api/excel/files")
        .then((res) => res.json())
        .then((data) => setFiles(data.files || []))
        .finally(() => setLoading(false));
    }
  }, [step, isAdmin]);

  // Step 2: Fetch sheets in selected file
  useEffect(() => {
    if (step === 2 && selectedFile) {
      setLoading(true);
      fetch(`/api/excel/sheets?fileId=${selectedFile}`)
        .then((res) => res.json())
        .then((data) => setSheets(data.sheets || []))
        .finally(() => setLoading(false));
    }
  }, [step, selectedFile]);

  // Step 3: Fetch data from selected sheet
  useEffect(() => {
    if (step === 3 && selectedFile && selectedSheet) {
      setLoading(true);
      fetch(`/api/excel/data?fileId=${selectedFile}&sheetName=${encodeURIComponent(selectedSheet)}`)
        .then((res) => res.json())
        .then((data) => setSheetData(data.values || []))
        .finally(() => setLoading(false));
    }
  }, [step, selectedFile, selectedSheet]);

  // Import data to Supabase
  const handleImport = async () => {
    if (!user || !sheetData.length) return;
    setImporting(true);
    setImportResult(null);
    try {
      const headers = sheetData[0];
      const rows = sheetData.slice(1).map((row: any[]) => {
        const obj: Record<string, any> = {};
        headers.forEach((h: string, i: number) => {
          obj[h] = row[i];
        });
        return obj;
      });
      const { error } = await supabase.from("raw_data").insert(
        rows.map((row: any) => ({
          user_id: user.id,
          source_system: "excel_api",
          raw_data: row,
          ingested_at: new Date().toISOString(),
        }))
      );
      if (error) throw error;
      setImportResult(`Imported ${rows.length} rows to Bloom.`);
    } catch (err: any) {
      setImportResult(`Error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#18181B]">Bloom ESG – Excel Import</h1>
          <button
            onClick={() => {
              supabase.auth.signOut();
              router.push("/");
            }}
            className="text-sm text-[#18181B] border border-[#E5E7EB] rounded px-4 py-2 transition-colors duration-150 bg-[#F3F4F6] hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#18181B]">Import Data from Excel</h2>
          {/* Step 1: Select File */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 1: Select an Excel File</h3>
              {loading ? (
                <p>Loading files...</p>
              ) : files.length === 0 ? (
                <p>No Excel files found in your OneDrive Business.</p>
              ) : (
                <ul className="space-y-2">
                  {files.map((file) => (
                    <li key={file.id}>
                      <button
                        className="w-full text-left px-4 py-2 rounded border border-[#E5E7EB] bg-[#F8FAFC] hover:bg-[#F3F4F6] text-[#18181B] font-semibold"
                        onClick={() => {
                          setSelectedFile(file.id);
                          setStep(2);
                        }}
                      >
                        {file.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {/* Step 2: Select Sheet */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 2: Select a Sheet</h3>
              <button
                className="mb-4 text-[#2563EB] hover:underline"
                onClick={() => setStep(1)}
              >
                ← Back to files
              </button>
              {loading ? (
                <p>Loading sheets...</p>
              ) : sheets.length === 0 ? (
                <p>No sheets found in this file.</p>
              ) : (
                <ul className="space-y-2">
                  {sheets.map((sheet) => (
                    <li key={sheet.id}>
                      <button
                        className="w-full text-left px-4 py-2 rounded border border-[#E5E7EB] bg-[#F8FAFC] hover:bg-[#F3F4F6] text-[#18181B] font-semibold"
                        onClick={() => {
                          setSelectedSheet(sheet.name);
                          setStep(3);
                        }}
                      >
                        {sheet.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {/* Step 3: Preview Data and Import */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 3: Preview Data</h3>
              <button
                className="mb-4 text-[#2563EB] hover:underline"
                onClick={() => setStep(2)}
              >
                ← Back to sheets
              </button>
              {loading ? (
                <p>Loading data...</p>
              ) : sheetData.length === 0 ? (
                <p>No data found in this sheet.</p>
              ) : (
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full text-sm bg-white border border-[#E5E7EB] rounded">
                    <thead className="bg-[#F3F4F6]">
                      <tr>
                        {sheetData[0].map((header: string, i: number) => (
                          <th key={i} className="px-4 py-2 text-left font-bold text-[#18181B] border-b border-[#E5E7EB]">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetData.slice(1, 11).map((row: any[], i: number) => (
                        <tr key={i} className="hover:bg-[#F8FAFC]">
                          {row.map((cell, j) => (
                            <td key={j} className="px-4 py-2 text-[#18181B] border-b border-[#E5E7EB]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 mt-2">Showing first 10 rows.</p>
                </div>
              )}
              <button
                onClick={handleImport}
                disabled={importing || !sheetData.length}
                className="bg-[#2563EB] text-white px-6 py-2 rounded font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors duration-150"
              >
                {importing ? "Importing..." : "Import to Bloom"}
              </button>
              {importResult && (
                <p className={`mt-4 font-semibold ${importResult.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{importResult}</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 