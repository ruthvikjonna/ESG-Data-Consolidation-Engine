import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const nodeFetch: typeof fetch = (input, init) => {
  if (init) {
    (init as any).duplex = 'half'
  }
  return fetch(input, init)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: { fetch: nodeFetch },
  }
)

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    company_name,
    metric_type,
    value,
    source_system,
    pull_time,
    user_id,
    raw_data = null,
  } = body

  if (!company_name || !metric_type || !value || !source_system || !user_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase.from('esg_data').insert([
    {
      company_name,
      metric_type,
      value,
      source_system,
      pull_time: pull_time || new Date().toISOString(),
      user_id,
      raw_data,
    },
  ])

  if (error) {
    console.error('Insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
