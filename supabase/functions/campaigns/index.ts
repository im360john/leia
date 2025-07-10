import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

async function triggerEmailSending(supabaseClient: any, campaign: any) {
  try {
    console.log(`Triggering email send for campaign ${campaign.id}`)
    
    // Get target segment customers
    let recipients = []
    
    if (campaign.target_segment) {
      // Get segment details
      const { data: segment } = await supabaseClient
        .from('segments')
        .select('*')
        .eq('id', campaign.target_segment)
        .single()
      
      if (segment) {
        // For POC, we'll use mock customer data
        // In production, this would query actual customer data based on segment criteria
        recipients = generateMockRecipients(segment.customer_count || 10)
      }
    } else {
      // If no segment, use a small set of test recipients
      recipients = generateMockRecipients(5)
    }

    // Call the send-email edge function
    const sendEmailUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`
    const response = await fetch(sendEmailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaignId: campaign.id,
        recipients: recipients,
        subject: campaign.subject || 'Marketing Update',
        htmlContent: campaign.content,
        textContent: stripHtml(campaign.content),
        from: 'marketing@yourdomain.com',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to trigger email send:', error)
      throw new Error(`Failed to send emails: ${error}`)
    }

    const result = await response.json()
    console.log(`Email sending triggered: ${result.sent} sent, ${result.failed} failed`)
  } catch (error) {
    console.error('Error triggering email send:', error)
    // Don't throw here - we don't want to fail the campaign update
    // In production, you might want to update the campaign status to 'failed'
  }
}

function generateMockRecipients(count: number) {
  // For POC testing, always send to john@treez.io
  const testEmail = 'john@treez.io'
  
  // Generate multiple test recipients but all going to the same email
  const recipients = []
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller']
  
  // Only send 3 test emails for POC to avoid spam
  for (let i = 0; i < Math.min(count, 3); i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    recipients.push({
      email: testEmail, // Always use test email
      name: `${firstName} ${lastName}`,
      customData: {
        firstName,
        lastName,
        customerSince: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        originalEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`, // Track what email it would have been
      }
    })
  }
  
  return recipients
}

function stripHtml(html: string): string {
  // Simple HTML stripping for text version
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { method } = req
    
    // If invoked via supabase.functions.invoke, check for method in body
    let actualMethod = method
    if (method === 'POST') {
      const bodyText = await req.text()
      const body = bodyText ? JSON.parse(bodyText) : {}
      if (body.method) {
        actualMethod = body.method
        // Remove method from body for further processing
        delete body.method
        // Create new request with cleaned body
        req = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(body)
        })
      }
    }

    switch (actualMethod) {
      case 'GET': {
        const { data, error } = await supabaseClient
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        return new Response(
          JSON.stringify(data || []),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      case 'POST': {
        const body = await req.json()
        const { data, error } = await supabaseClient
          .from('campaigns')
          .insert([body])
          .select()
          .single()

        if (error) {
          throw error
        }

        return new Response(
          JSON.stringify(data),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
          },
        )
      }

      case 'PUT': {
        const body = await req.json()
        const { id, ...updates } = body
        
        // Check if status is being changed to active
        const previousCampaign = await supabaseClient
          .from('campaigns')
          .select('status, type')
          .eq('id', id)
          .single()

        const { data, error } = await supabaseClient
          .from('campaigns')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          throw error
        }

        // If campaign is being activated and it's an email campaign, trigger email sending
        if (previousCampaign.data?.status !== 'active' && 
            updates.status === 'active' && 
            data.type === 'email') {
          await triggerEmailSending(supabaseClient, data)
        }

        return new Response(
          JSON.stringify(data),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      case 'DELETE': {
        const body = await req.json()
        const { id } = body
        
        const { error } = await supabaseClient
          .from('campaigns')
          .delete()
          .eq('id', id)

        if (error) {
          throw error
        }

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405,
          },
        )
    }
  } catch (error) {
    console.error('Campaigns function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})