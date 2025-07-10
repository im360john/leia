import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Convert segment criteria to Snowflake WHERE clause
function criteriaToWhereClause(criteria: any): string {
  const conditions: string[] = []
  
  if (criteria.minRevenue) {
    conditions.push(`TOTAL_SPEND >= ${criteria.minRevenue}`)
  }
  
  if (criteria.maxRevenue) {
    conditions.push(`TOTAL_SPEND <= ${criteria.maxRevenue}`)
  }
  
  if (criteria.lastPurchaseDays) {
    conditions.push(`DAYS_SINCE_LAST_PURCHASE <= ${criteria.lastPurchaseDays}`)
  }
  
  if (criteria.minOrderCount) {
    conditions.push(`ORDER_COUNT >= ${criteria.minOrderCount}`)
  }
  
  if (criteria.productCategory) {
    conditions.push(`FAVORITE_CATEGORY = '${criteria.productCategory}'`)
  }
  
  if (criteria.customerTier) {
    conditions.push(`CUSTOMER_TIER = '${criteria.customerTier}'`)
  }
  
  if (criteria.lifetimeValue && criteria.lifetimeValue.min) {
    conditions.push(`LIFETIME_VALUE >= ${criteria.lifetimeValue.min}`)
  }
  
  if (criteria.lifetimeValue && criteria.lifetimeValue.max) {
    conditions.push(`LIFETIME_VALUE <= ${criteria.lifetimeValue.max}`)
  }
  
  if (criteria.churnRisk) {
    conditions.push(`CHURN_RISK_SCORE > 0.7`)
  }
  
  return conditions.length > 0 ? conditions.join(' AND ') : '1=1'
}

// Query Snowflake for customer count
async function getSnowflakeCustomerCount(whereClause: string, authToken?: string): Promise<number> {
  try {
    const snowflakeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/snowflake-query`
    // Use service role key when calling from edge function, or passed auth token
    const token = authToken || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    
    const response = await fetch(snowflakeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'count',
        whereClause: whereClause,
      }),
    })
    
    if (!response.ok) {
      console.error('Snowflake query failed:', await response.text())
      return 0
    }
    
    const result = await response.json()
    return result.data?.count || 0
  } catch (error) {
    console.error('Error querying Snowflake:', error)
    return 0
  }
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

        // Enrich segments with real-time Snowflake customer counts
        const enrichedSegments = await Promise.all(
          (data || []).map(async (segment) => {
            if (segment.type === 'behavioral' && segment.criteria) {
              const whereClause = criteriaToWhereClause(segment.criteria)
              const customerCount = await getSnowflakeCustomerCount(whereClause)
              
              // Update the segment with real-time count
              await supabaseClient
                .from('segments')
                .update({ customer_count: customerCount })
                .eq('id', segment.id)
              
              return { ...segment, customer_count: customerCount }
            }
            return segment
          })
        )

        return new Response(
          JSON.stringify(enrichedSegments),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      case 'POST': {
        const body = await req.json()
        
        // Get real-time customer count from Snowflake for behavioral segments
        let customerCount = body.customer_count || 0
        if (body.type === 'behavioral' && body.criteria) {
          const whereClause = criteriaToWhereClause(body.criteria)
          customerCount = await getSnowflakeCustomerCount(whereClause)
        }
        
        const { data, error } = await supabaseClient
          .from('segments')
          .insert([{ ...body, customer_count: customerCount }])
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
        
        // Get real-time customer count from Snowflake for behavioral segments
        if (updates.type === 'behavioral' && updates.criteria) {
          const whereClause = criteriaToWhereClause(updates.criteria)
          updates.customer_count = await getSnowflakeCustomerCount(whereClause)
        }
        
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