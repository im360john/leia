import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueryRequest {
  type: 'schema' | 'count' | 'preview' | 'execute'
  table?: string
  whereClause?: string
  limit?: number
}

// Use Snowflake SQL API v1 which supports basic auth
async function executeSnowflakeQuery(
  account: string,
  username: string,
  password: string,
  warehouse: string,
  database: string,
  schema: string,
  statement: string
): Promise<any> {
  // SQL API v1 endpoint
  const url = `https://${account}.snowflakecomputing.com/api/statements`
  
  console.log(`Executing query on ${account} (API v1)`)
  console.log(`Database: ${database}, Schema: ${schema}, Warehouse: ${warehouse}`)
  console.log(`Query: ${statement.substring(0, 200)}...`)
  
  const auth = btoa(`${username}:${password}`)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Supabase-Edge-Function/1.0',
    },
    body: JSON.stringify({
      statement,
      timeout: 60,
      database,
      schema,
      warehouse,
      role: 'PUBLIC',
      parameters: {
        'MULTI_STATEMENT_COUNT': 0,
      }
    }),
  })

  const responseText = await response.text()
  console.log('Response status:', response.status)
  
  if (!response.ok) {
    console.error('Snowflake error response:', responseText)
    throw new Error(`Snowflake API error (${response.status}): ${responseText}`)
  }

  try {
    const result = JSON.parse(responseText)
    
    // Check if we need to get results from partition
    if (result.statementHandle && result.resultSetMetaData) {
      // Get the actual data
      const dataUrl = `https://${account}.snowflakecomputing.com/api/statements/${result.statementHandle}/result/1`
      
      const dataResponse = await fetch(dataUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0',
        },
      })
      
      if (dataResponse.ok) {
        const dataResult = await dataResponse.json()
        return {
          ...result,
          data: dataResult.data,
        }
      }
    }
    
    return result
  } catch (e) {
    console.error('Failed to parse response:', e)
    throw new Error(`Invalid response from Snowflake: ${responseText}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Snowflake query function invoked (API v1)')
    
    // Get Snowflake credentials from environment
    const account = Deno.env.get('SNOWFLAKE_ACCOUNT') || ''
    const username = Deno.env.get('SNOWFLAKE_USERNAME') || ''
    const password = Deno.env.get('SNOWFLAKE_PASSWORD') || ''
    const warehouse = Deno.env.get('SNOWFLAKE_WAREHOUSE') || 'COMPUTE_WH'
    
    // Validate credentials
    if (!account || !username || !password) {
      throw new Error('Snowflake credentials not configured. Please set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, and SNOWFLAKE_PASSWORD.')
    }

    const { type, table, whereClause, limit = 100 } = await req.json() as QueryRequest
    console.log('Query type:', type)

    const database = 'RETAIL_ANALYTICS'
    const schema = 'DBT_CUSTOMER'
    const tableName = 'CUSTOMER_FACT'
    
    let result: any = {}

    switch (type) {
      case 'schema':
        // Get table schema information
        const schemaQuery = `
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COMMENT
          FROM ${database}.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_CATALOG = '${database}'
            AND TABLE_SCHEMA = '${schema}'
            AND TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `
        
        const schemaResponse = await executeSnowflakeQuery(
          account,
          username,
          password,
          warehouse,
          database,
          schema,
          schemaQuery
        )
        
        if (!schemaResponse.data) {
          throw new Error('No schema data returned from Snowflake')
        }
        
        result = {
          columns: schemaResponse.data.map((row: any[]) => ({
            name: row[0],
            type: row[1],
            nullable: row[2] === 'YES',
            comment: row[3] || '',
          })),
        }
        break

      case 'count':
        // Get count with WHERE clause
        const orgFilter = "ORG_ID = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5'"
        const fullWhereClause = whereClause 
          ? `${orgFilter} AND (${whereClause})`
          : orgFilter
          
        const countQuery = `
          SELECT COUNT(*) as customer_count
          FROM ${database}.${schema}.${tableName}
          WHERE ${fullWhereClause}
        `
        
        const countResponse = await executeSnowflakeQuery(
          account,
          username,
          password,
          warehouse,
          database,
          schema,
          countQuery
        )
        
        if (!countResponse.data || countResponse.data.length === 0) {
          throw new Error('No count data returned from Snowflake')
        }
        
        result = {
          count: parseInt(countResponse.data[0][0]),
          whereClause: fullWhereClause,
        }
        break

      case 'preview':
        // Get sample records
        const orgFilterPreview = "ORG_ID = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5'"
        const fullWhereClausePreview = whereClause 
          ? `${orgFilterPreview} AND (${whereClause})`
          : orgFilterPreview
          
        const previewQuery = `
          SELECT *
          FROM ${database}.${schema}.${tableName}
          WHERE ${fullWhereClausePreview}
          LIMIT ${limit}
        `
        
        const previewResponse = await executeSnowflakeQuery(
          account,
          username,
          password,
          warehouse,
          database,
          schema,
          previewQuery
        )
        
        if (!previewResponse.data) {
          throw new Error('No preview data returned from Snowflake')
        }
        
        // Extract column names from metadata
        const columnNames = previewResponse.resultSetMetaData?.rowType?.map((col: any) => col.name) || []
        
        result = {
          rows: previewResponse.data,
          columns: columnNames,
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