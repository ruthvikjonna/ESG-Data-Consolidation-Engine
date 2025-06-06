import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';

export const config = {
  api: {
    bodyParser: false, // required for formidable
  },
};

// initialize supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// parse incoming form-data (file + fields)
async function parseFormData(req: any): Promise<{ fields: Fields; filePath: string }> {
  const form = formidable({ uploadDir: '/tmp', keepExtensions: true });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields: Fields, files: Files) => {
      if (err) return reject(err);

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file || !(file as File).filepath) return reject(new Error('CSV file missing'));

      resolve({ fields, filePath: (file as File).filepath });
    });
  });
}

// POST /api/ingest
export async function POST(req: NextRequest) {
  try {
    const { fields, filePath } = await parseFormData(req);
    const results: any[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          results.push({
            user_id: fields.user_id || 'test-user',
            source_system: fields.source || 'Manual Upload',
            ingested_at: new Date().toISOString(),
            data: row,
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const { error } = await supabase.from('esg_data').insert(results);
    if (error) throw new Error(error.message);

    return NextResponse.json({ message: 'Data ingested successfully', rows: results.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
