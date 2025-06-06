import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { supabase } from '@/lib/supabase';

export const config = {
  api: {
    bodyParser: false,
  },
};

// parse incoming form-data (file + fields)
async function parseFormData(req: Request): Promise<{ fields: Fields; filePath: string }> {
  const form = formidable({ uploadDir: './tmp', keepExtensions: true });

  // Convert web stream to Node.js stream and attach required headers
  const headers: any = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const nodeReq = Object.assign(Readable.fromWeb(req.body as any), {
    headers,
    method: req.method,
    url: '',
  });

  return new Promise((resolve, reject) => {
    form.parse(nodeReq as any, (err, fields: Fields, files: Files) => {
      if (err) return reject(err);

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file || !(file as File).filepath) return reject(new Error('CSV file missing'));

      resolve({ fields, filePath: (file as File).filepath });
    });
  });
}

// POST /api/ingest
export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('authorization') || '',
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');
    const userId = user.id;

    const { fields, filePath } = await parseFormData(req);
    const results: any[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          results.push({
            user_id: userId,
            source_system: fields.source || 'Manual Upload',
            pull_time: new Date().toISOString(),
            raw_data: row,
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
