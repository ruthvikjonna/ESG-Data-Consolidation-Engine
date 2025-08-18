import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get recent data updates, ordered by creation time
    const { data: updates, error } = await supabase
      .from('data_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50); // Limit to last 50 updates

    if (error) {
      throw error;
    }

    return NextResponse.json(updates || []);

  } catch (error) {
    console.error('Error fetching data updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data updates' },
      { status: 500 }
    );
  }
}
