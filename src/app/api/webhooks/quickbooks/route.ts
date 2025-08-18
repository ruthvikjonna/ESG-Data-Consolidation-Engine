import { NextRequest, NextResponse } from 'next/server';
import { webhookManager } from '@/lib/webhookManager';
import { WebhookPayload } from '@/lib/webhookManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify the webhook is from QuickBooks (you should implement proper verification)
    const signature = request.headers.get('x-intuit-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Parse QuickBooks webhook payload
    const webhookPayload: WebhookPayload = {
      source: 'quickbooks',
      eventType: body.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0]?.name || 'unknown',
      resourceId: body.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0]?.id || '',
      timestamp: new Date().toISOString(),
      data: body,
    };

    // Process the webhook asynchronously
    webhookManager.processWebhook(webhookPayload).catch(error => {
      console.error('Error processing QuickBooks webhook:', error);
    });

    // Return success immediately (webhook processing is async)
    return NextResponse.json({ 
      status: 'received',
      message: 'Webhook received and queued for processing'
    });

  } catch (error) {
    console.error('Error processing QuickBooks webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Webhook verification endpoint for QuickBooks
  const challengeCode = request.nextUrl.searchParams.get('challenge_code');
  
  if (challengeCode) {
    return NextResponse.json({ challenge_code: challengeCode });
  }
  
  return NextResponse.json({ message: 'QuickBooks webhook endpoint' });
}
