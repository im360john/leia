import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface DashboardData {
  totalRevenue: number
  totalCampaigns: number
  totalSegments: number
  avgOpenRate: number
  recentCampaigns: any[]
  topSegments: any[]
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

    // Get campaigns data
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
    }

    // Get segments data
    const { data: segments, error: segmentsError } = await supabaseClient
      .from('segments')
      .select('*')
      .order('customer_count', { ascending: false })

    if (segmentsError) {
      console.error('Error fetching segments:', segmentsError)
    }

    // Calculate dashboard metrics
    const totalCampaigns = campaigns?.length || 0
    const totalSegments = segments?.length || 0
    const totalRevenue = campaigns?.reduce((sum, campaign) => sum + (campaign.revenue || 0), 0) || 0
    const avgOpenRate = campaigns?.length > 0 
      ? campaigns.reduce((sum, campaign) => sum + (campaign.open_rate || 0), 0) / campaigns.length 
      : 0

    const dashboardData: DashboardData = {
      totalRevenue,
      totalCampaigns,
      totalSegments,
      avgOpenRate,
      recentCampaigns: campaigns?.slice(0, 5) || [],
      topSegments: segments?.slice(0, 5) || []
    }

    return new Response(
      JSON.stringify(dashboardData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Dashboard function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})