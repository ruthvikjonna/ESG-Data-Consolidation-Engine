import { NextRequest, NextResponse } from 'next/server';
import { webhookManager } from '@/lib/webhookManager';
import { WebhookPayload } from '@/lib/webhookManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify the webhook is from Google (you should implement proper verification)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    // Parse Google Sheets webhook payload
    const webhookPayload: WebhookPayload = {
      source: 'google-sheets',
      eventType: body.state || 'spreadsheet.updated',
      resourceId: body.resourceId || body.spreadsheetId || '',
      timestamp: new Date().toISOString(),
      data: body,
    };

    // Process the webhook asynchronously
    webhookManager.processWebhook(webhookPayload).catch(error => {
      console.error('Error processing Google Sheets webhook:', error);
    });

    // Return success immediately (webhook processing is async)
    return NextResponse.json({ 
      status: 'received',
      message: 'Webhook received and queued for processing'
    });

  } catch (error) {
    console.error('Error processing Google Sheets webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Webhook verification endpoint for Google
  const challengeCode = request.nextUrl.searchParams.get('challenge_code');
  
  if (challengeCode) {
    return NextResponse.json({ challenge_code: challengeCode });
  }
  
  return NextResponse.json({ message: 'Google Sheets webhook endpoint' });
}
