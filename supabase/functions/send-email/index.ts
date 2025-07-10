import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  campaignId: string
  recipients: Array<{
    email: string
    name?: string
    customData?: Record<string, any>
  }>
  subject: string
  htmlContent: string
  textContent?: string
  from?: string
  replyTo?: string
}

interface ResendResponse {
  data?: {
    id: string
  }
  error?: {
    message: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { campaignId, recipients, subject, htmlContent, textContent, from, replyTo } = await req.json() as EmailRequest

    // Validate required fields
    if (!campaignId || !recipients || !subject || !htmlContent) {
      throw new Error('Missing required fields: campaignId, recipients, subject, htmlContent')
    }

    const fromEmail = from || 'hello@leia-demo.com'
    const results = []
    const errors = []

    // Send emails in batches to avoid rate limits
    const batchSize = 100
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      // Send emails in parallel within each batch
      const batchPromises = batch.map(async (recipient) => {
        try {
          // Personalize content if needed
          let personalizedHtml = htmlContent
          let personalizedText = textContent || ''
          
          if (recipient.customData) {
            // Simple template replacement
            Object.entries(recipient.customData).forEach(([key, value]) => {
              const placeholder = `{{${key}}}`
              personalizedHtml = personalizedHtml.replace(new RegExp(placeholder, 'g'), String(value))
              personalizedText = personalizedText.replace(new RegExp(placeholder, 'g'), String(value))
            })
          }

          // Send via Resend API
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [recipient.email],
              subject: subject,
              html: personalizedHtml,
              text: personalizedText,
              reply_to: replyTo,
              tags: [
                { name: 'campaign_id', value: campaignId },
              ],
            }),
          })

          const data = await response.json() as ResendResponse

          if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to send email')
          }

          // Store email record
          await supabaseClient
            .from('campaign_emails')
            .insert({
              campaign_id: campaignId,
              email: recipient.email,
              message_id: data.data?.id,
              status: 'sent',
              sent_at: new Date().toISOString(),
            })

          results.push({
            email: recipient.email,
            messageId: data.data?.id,
            status: 'sent',
          })
        } catch (error) {
          console.error(`Failed to send email to ${recipient.email}:`, error)
          
          // Store failed email record
          await supabaseClient
            .from('campaign_emails')
            .insert({
              campaign_id: campaignId,
              email: recipient.email,
              status: 'failed',
              error_message: error.message,
            })

          errors.push({
            email: recipient.email,
            error: error.message,
          })
        }
      })

      await Promise.all(batchPromises)
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Update campaign stats
    const sentCount = results.length
    const failedCount = errors.length

    await supabaseClient
      .from('campaigns')
      .update({
        sent_count: sentCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        results,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})