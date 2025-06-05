import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    company_name,
    metric_type,
    value,
    source_system,
    pull_time,
    user_id,
  } = body

  // Basic validation
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
    },
  ])

  if (error) {
    console.error('Insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
