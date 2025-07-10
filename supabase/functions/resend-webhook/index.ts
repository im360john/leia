import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked'
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    click?: {
      link: string
      timestamp: number
    }
    bounce?: {
      type: string
      message: string
    }
    complaint?: {
      feedback_type: string
    }
    tags?: Array<{
      name: string
      value: string
    }>
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook signature
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
    if (webhookSecret) {
      const signature = req.headers.get('resend-signature')
      const timestamp = req.headers.get('resend-timestamp')
      const body = await req.text()
      
      if (!signature || !timestamp) {
        throw new Error('Missing webhook signature or timestamp')
      }

      // Verify signature (Resend uses HMAC-SHA256)
      const signedContent = `${timestamp}.${body}`
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(signedContent)
        .digest('hex')

      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature')
      }

      // Parse the body after verification
      const event = JSON.parse(body) as ResendWebhookEvent

      // Process the webhook
      await processWebhookEvent(event)
    } else {
      // If no webhook secret is set, process without verification (POC mode)
      const event = await req.json() as ResendWebhookEvent
      await processWebhookEvent(event)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function processWebhookEvent(event: ResendWebhookEvent) {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const messageId = event.data.email_id
  const eventType = event.type
  const timestamp = new Date(event.created_at).toISOString()

  // Extract campaign_id from tags
  const campaignTag = event.data.tags?.find(tag => tag.name === 'campaign_id')
  const campaignId = campaignTag?.value

  console.log(`Processing ${eventType} event for message ${messageId}`)

  // Update campaign_emails table based on event type
  let updateData: Record<string, any> = {}
  
  switch (eventType) {
    case 'email.sent':
      updateData = {
        status: 'sent',
        sent_at: timestamp,
      }
      break
    
    case 'email.delivered':
      updateData = {
        status: 'delivered',
        delivered_at: timestamp,
      }
      break
    
    case 'email.opened':
      updateData = {
        status: 'opened',
        opened_at: timestamp,
      }
      break
    
    case 'email.clicked':
      updateData = {
        status: 'clicked',
        clicked_at: timestamp,
      }
      break
    
    case 'email.bounced':
      updateData = {
        status: 'bounced',
        bounced_at: timestamp,
        error_message: event.data.bounce?.message || 'Email bounced',
      }
      break
    
    case 'email.complained':
      updateData = {
        status: 'bounced',
        bounced_at: timestamp,
        error_message: `Spam complaint: ${event.data.complaint?.feedback_type || 'unknown'}`,
      }
      break
  }

  // Update the campaign_emails record
  const { error: updateError } = await supabaseClient
    .from('campaign_emails')
    .update(updateData)
    .eq('message_id', messageId)

  if (updateError) {
    console.error('Error updating campaign_emails:', updateError)
    throw updateError
  }

  // Update campaign aggregated metrics if we have a campaign_id
  if (campaignId) {
    await updateCampaignMetrics(supabaseClient, campaignId)
  }
}

async function updateCampaignMetrics(supabaseClient: any, campaignId: string) {
  // Get aggregated stats from campaign_email_stats view
  const { data: stats, error: statsError } = await supabaseClient
    .from('campaign_email_stats')
    .select('*')
    .eq('campaign_id', campaignId)
    .single()

  if (statsError) {
    console.error('Error fetching campaign stats:', statsError)
    return
  }

  // Update campaign with latest metrics
  const { error: updateError } = await supabaseClient
    .from('campaigns')
    .update({
      sent_count: stats.sent_count,
      delivered_count: stats.delivered_count,
      bounced_count: stats.bounced_count,
      open_rate: stats.open_rate,
      click_rate: stats.click_rate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  if (updateError) {
    console.error('Error updating campaign metrics:', updateError)
  }
}