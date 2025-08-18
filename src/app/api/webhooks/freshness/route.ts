import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get data freshness information for each source
    const { data: freshness, error } = await supabase
      .from('data_freshness')
      .select('*')
      .order('last_update', { ascending: false });

    if (error) {
      throw error;
    }

    // If no freshness data exists, create default entries
    if (!freshness || freshness.length === 0) {
      const defaultFreshness = [
        {
          source: 'quickbooks',
          last_update: new Date().toISOString(),
          event_type: 'none',
          status: 'pending',
        },
        {
          source: 'google-sheets',
          last_update: new Date().toISOString(),
          event_type: 'none',
          status: 'pending',
        },
        {
          source: 'microsoft-graph',
          last_update: new Date().toISOString(),
          event_type: 'none',
          status: 'pending',
        },
      ];

      // Insert default entries
      const { error: insertError } = await supabase
        .from('data_freshness')
        .insert(defaultFreshness);

      if (insertError) {
        console.error('Error inserting default freshness data:', insertError);
      }

      return NextResponse.json(defaultFreshness);
    }

    return NextResponse.json(freshness);

  } catch (error) {
    console.error('Error fetching data freshness:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data freshness' },
      { status: 500 }
    );
  }
}
