"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Papa, { ParseResult, ParseError } from "papaparse";
import * as XLSX from "xlsx";

export default function ManualUpload() {
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) router.push("/sign-in");
    });
  }, [router]);

  // File parsing logic
  const handleFile = (file: File) => {
    setFile(file);
    setErrors([]);
    setImportResult(null);
    setLoading(true);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse<File>(file, {
        complete: (results: ParseResult<any>) => {
          setData(results.data as any[][]);
          setHeaders(results.data[0] || []);
          setLoading(false);
        },
        error: (error: Error, _file: File) => {
          setErrors([{ row: 0, message: error.message }]);
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
        setHeaders((json[0] as string[]) || []);
        setLoading(false);
      };
      reader.onerror = () => {
        setErrors([{ row: 0, message: "Failed to read Excel file." }]);
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
            setHeaders(keys);
          } else {
            setErrors([{ row: 0, message: "JSON must be an array of objects." }]);
          }
        } catch (err: any) {
          setErrors([{ row: 0, message: err.message }]);
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setErrors([{ row: 0, message: "Failed to read JSON file." }]);
        setLoading(false);
      };
      reader.readAsText(file);
    } else {
      setErrors([{ row: 0, message: "Unsupported file type." }]);
      setLoading(false);
    }
  };

  // Import data to Supabase
  const handleImport = async () => {
    if (!user || !data.length) return;
    setImporting(true);
    setImportResult(null);
    setErrors([]);
    try {
      const rows = data.slice(1).map((row: any[]) => {
        const obj: Record<string, any> = {};
        headers.forEach((h: string, i: number) => {
          obj[h] = row[i];
        });
        return obj;
      });
      // Optional: Add row-level validation here
      const { error } = await supabase.from("ingested_data").insert(
        rows.map((row: any) => ({
          user_id: user.id,
          source_system: "manual_upload",
          raw_payload: row,
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#18181B]">Bloom ESG – Manual Upload</h1>
          <button
            onClick={() => {
              supabase.auth.signOut();
              router.push("/sign-in");
            }}
            className="text-sm text-[#18181B] border border-[#E5E7EB] rounded px-4 py-2 transition-colors duration-150 bg-[#F3F4F6] hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#18181B]">Import Data (Manual Upload)</h2>
          {/* Upload UI */}
          <div className="mb-8">
            <label className="block mb-2 font-semibold text-[#18181B]">Select a file to upload (.csv, .xlsx, .xls, .json):</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#2563EB] file:text-white hover:file:bg-[#1D4ED8]"
            />
          </div>
          {/* Feedback/Error */}
          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {errors.map((err, i) => (
                <div key={i}>Row {err.row}: {err.message}</div>
              ))}
            </div>
          )}
          {/* Preview Table */}
          {loading ? (
            <p>Parsing file...</p>
          ) : data.length > 0 && (
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full text-sm bg-white border border-[#E5E7EB] rounded">
                <thead className="bg-[#F3F4F6]">
                  <tr>
                    {headers.map((header, i) => (
                      <th key={i} className="px-4 py-2 text-left font-bold text-[#18181B] border-b border-[#E5E7EB]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(1, 21).map((row, i) => (
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
              <p className="text-xs text-gray-500 mt-2">Showing first 20 rows. Total rows: {data.length - 1}</p>
            </div>
          )}
          {/* Import Button */}
          {data.length > 1 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-[#2563EB] text-white px-6 py-2 rounded font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors duration-150"
            >
              {importing ? "Importing..." : "Import to Bloom"}
            </button>
          )}
          {/* Import Result */}
          {importResult && (
            <p className={`mt-4 font-semibold ${importResult.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{importResult}</p>
          )}
        </div>
      </main>
    </div>
  );
}
