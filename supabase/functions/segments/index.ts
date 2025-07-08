import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    switch (method) {
      case 'GET': {
        const { data, error } = await supabaseClient
          .from('segments')
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
          .from('segments')
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
        
        const { data, error } = await supabaseClient
          .from('segments')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          throw error
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
          .from('segments')
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
    console.error('Segments function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})