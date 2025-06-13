'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function UploadMapping() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [canonicalFields, setCanonicalFields] = useState<string[]>([
    'employee_id', 'first_name', 'last_name', 'email', 'title', 'salary', 'hire_date', 'birth_date', 'gender',
  ]); // (Adjust as needed.)

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
    formData.append("source_system", "manual_upload"); // (Or a dynamic value.)
    try {
      const res = await fetch("/api/ingest", { method: "POST", body: formData, headers: { Authorization: `Bearer ${accessToken}`, } });
      const data = await res.json();
      if (res.ok) {
         setUploadResult(`Ingest complete: ${data.count} rows.`);
         // (Optional) Parse file (e.g., CSV) to detect columns (adjust as needed).
         const fileText = await file.text();
         const { parse } = await import("csv-parse/sync");
         const rows = parse(fileText, { columns: true, skip_empty_lines: true });
         if (rows.length > 0) {
           setDetectedColumns(Object.keys(rows[0]));
         }
      } else {
         setUploadResult(`Error: ${data.error || "Unknown error."}`);
      }
    } catch (err: any) {
         setUploadResult(`Error: ${err.message}`);
    } finally { setUploading(false); }
  };

  const handleMappingChange = (userCol: string, canonicalField: string) => {
    setMapping((prev) => ({ ...prev, [userCol]: canonicalField }));
  };

  const handleSaveMapping = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    const user_id = session?.user?.id;
    if (!user_id) { alert("User not authenticated."); return; }
    const { error } = await supabase.from("column_mappings").insert({ user_id, integration_id: "manual_upload", mapping, });
    if (error) { alert("Error saving mapping: " + error.message); } else { alert("Mapping saved."); }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Upload & Map Data</h1>
      <input type="file" onChange={handleFileChange} accept=".csv,.xlsx,.json" className="mb-4" />
      <button onClick={handleUpload} disabled={!file || uploading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"> Upload (Ingest) </button>
      {uploading && <p>Uploading…</p>}
      {uploadResult && <p>{uploadResult}</p>}
      {detectedColumns.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Map Columns</h2>
          {detectedColumns.map((col) => (
            <div key={col} className="mb-2">
              <label className="mr-2">{col} →</label>
              <select onChange={(e) => handleMappingChange(col, e.target.value)} value={mapping[col] || ""} className="border p-1 rounded">
                <option value=""> (Select Canonical Field) </option>
                {canonicalFields.map ( (f) => ( <option key={f} value={f}>{f} </option> ) )}
              </select>
            </div>
          ))}
          <button onClick={handleSaveMapping} className="mt-4 bg green-600 text white px 4 py 2 rounded hover: bg green 700"> Save Mapping </button>
        </div>
      )}
    </div>
  );
}
