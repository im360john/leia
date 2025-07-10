import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SnowflakeConfig {
  account: string
  username: string
  password: string
  database: string
  schema: string
  warehouse: string
}

interface QueryRequest {
  type: 'schema' | 'count' | 'preview' | 'execute'
  table?: string
  whereClause?: string
  limit?: number
}

async function executeSnowflakeQuery(config: SnowflakeConfig, query: string) {
  console.log('Executing Snowflake query:', query)
  
  // Use Snowflake SQL API endpoint
  const baseUrl = `https://${config.account}.snowflakecomputing.com/api/statements`
  
  // Create basic auth header
  const auth = btoa(`${config.username}:${config.password}`)
  
  // Execute the query
  const queryResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Snowflake-Authorization-Token-Type': 'KEYPAIR',
    },
    body: JSON.stringify({
      statement: query,
      timeout: 60,
      database: config.database,
      schema: config.schema,
      warehouse: config.warehouse,
      role: 'PUBLIC',
    }),
  })

  if (!queryResponse.ok) {
    const error = await queryResponse.text()
    console.error('Snowflake query failed:', error)
    throw new Error(`Snowflake query failed: ${error}`)
  }

  const result = await queryResponse.json()
  
  // Check if we need to wait for the query to complete
  if (result.statementHandle) {
    // Get results
    const resultsUrl = `${baseUrl}/${result.statementHandle}`
    let attempts = 0
    
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const statusResponse = await fetch(resultsUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      })
      
      if (!statusResponse.ok) {
        const error = await statusResponse.text()
        throw new Error(`Failed to get query results: ${error}`)
      }
      
      const statusData = await statusResponse.json()
      
      if (statusData.data && statusData.data.length > 0) {
        return statusData
      }
      
      attempts++
    }
    
    throw new Error('Query timeout')
  }
  
  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Snowflake credentials from environment
    const snowflakeConfig: SnowflakeConfig = {
      account: Deno.env.get('SNOWFLAKE_ACCOUNT') || '',
      username: Deno.env.get('SNOWFLAKE_USERNAME') || '',
      password: Deno.env.get('SNOWFLAKE_PASSWORD') || '',
      database: 'RETAIL_ANALYTICS',
      schema: 'DBT_CUSTOMER',
      warehouse: Deno.env.get('SNOWFLAKE_WAREHOUSE') || 'COMPUTE_WH',
    }

    // Validate credentials
    if (!snowflakeConfig.account || !snowflakeConfig.username || !snowflakeConfig.password) {
      throw new Error('Snowflake credentials not configured')
    }

    const { type, table, whereClause, limit = 100 } = await req.json() as QueryRequest

    let query = ''
    let result: any = {}

    switch (type) {
      case 'schema':
        // Get table schema information
        query = `
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COMMENT
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_CATALOG = '${snowflakeConfig.database}'
            AND TABLE_SCHEMA = '${snowflakeConfig.schema}'
            AND TABLE_NAME = 'CUSTOMER_FACT'
          ORDER BY ORDINAL_POSITION
        `
        const schemaData = await executeSnowflakeQuery(snowflakeConfig, query)
        result = {
          columns: schemaData.data?.map((row: any[]) => ({
            name: row[0],
            type: row[1],
            nullable: row[2] === 'YES',
            comment: row[3],
          })) || [],
        }
        break

      case 'count':
        // Get count with WHERE clause
        const orgFilter = "ORG_ID = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5'"
        const fullWhereClause = whereClause 
          ? `${orgFilter} AND (${whereClause})`
          : orgFilter
          
        query = `
          SELECT COUNT(*) as customer_count
          FROM ${snowflakeConfig.database}.${snowflakeConfig.schema}.CUSTOMER_FACT
          WHERE ${fullWhereClause}
        `
        const countData = await executeSnowflakeQuery(snowflakeConfig, query)
        result = {
          count: countData.data?.[0]?.[0] || 0,
          whereClause: fullWhereClause,
        }
        break

      case 'preview':
        // Get sample records
        const orgFilterPreview = "ORG_ID = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5'"
        const fullWhereClausePreview = whereClause 
          ? `${orgFilterPreview} AND (${whereClause})`
          : orgFilterPreview
          
        query = `
          SELECT *
          FROM ${snowflakeConfig.database}.${snowflakeConfig.schema}.CUSTOMER_FACT
          WHERE ${fullWhereClausePreview}
          LIMIT ${limit}
        `
        const previewData = await executeSnowflakeQuery(snowflakeConfig, query)
        result = {
          rows: previewData.data || [],
          columns: previewData.columns || [],
        }
        break

      default:
        throw new Error(`Unknown query type: ${type}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Snowflake query error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})