import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get total webhook count
    const { count: total, error: totalError } = await supabase
      .from('data_updates')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw totalError;
    }

    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('data_updates')
      .select('status');

    if (statusError) {
      throw statusError;
    }

    const successful = statusCounts?.filter(item => item.status === 'completed').length || 0;
    const failed = statusCounts?.filter(item => item.status === 'failed').length || 0;
    const pending = statusCounts?.filter(item => item.status === 'pending' || item.status === 'processing').length || 0;

    // Get counts by source
    const { data: sourceCounts, error: sourceError } = await supabase
      .from('data_updates')
      .select('source');

    if (sourceError) {
      throw sourceError;
    }

    const bySource = {
      quickbooks: sourceCounts?.filter(item => item.source === 'quickbooks').length || 0,
      'google-sheets': sourceCounts?.filter(item => item.source === 'google-sheets').length || 0,
      'microsoft-graph': sourceCounts?.filter(item => item.source === 'microsoft-graph').length || 0,
    };

    return NextResponse.json({
      total: total || 0,
      successful,
      failed,
      pending,
      bySource,
    });

  } catch (error) {
    console.error('Error fetching webhook stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook statistics' },
      { status: 500 }
    );
  }
}
