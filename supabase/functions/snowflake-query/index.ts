import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueryRequest {
  type: 'schema' | 'count' | 'preview' | 'execute'
  query?: string
  table?: string
  whereClause?: string
  limit?: number
}

// Authenticate with Snowflake
async function authenticateSnowflake(
  account: string,
  username: string,
  password: string
): Promise<string> {
  const loginUrl = `https://${account}.snowflakecomputing.com/session/v1/login-request`
  
  console.log(`Authenticating with Snowflake account: ${account}`)
  console.log(`Username: ${username}`)
  
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      data: {
        CLIENT_APP_ID: 'JavaScript',
        CLIENT_APP_VERSION: '1.0.0',
        ACCOUNT_NAME: account,
        LOGIN_NAME: username,
        PASSWORD: password,
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Auth error:', errorText)
    throw new Error(`Authentication failed: ${errorText}`)
  }

  const result = await response.json()
  if (!result.data?.token) {
    console.error('Auth response:', JSON.stringify(result))
    throw new Error('No token in authentication response')
  }
  
  console.log('Successfully authenticated with Snowflake')
  return result.data.token
}

// Execute query using session token
async function executeQuery(
  account: string,
  token: string,
  warehouse: string,
  database: string,
  schema: string,
  statement: string
): Promise<any> {
  const queryUrl = `https://${account}.snowflakecomputing.com/queries/v1/query-request`
  
  console.log(`Executing query on warehouse: ${warehouse}`)
  console.log(`Database: ${database}, Schema: ${schema}`)
  console.log(`SQL: ${statement}`)
  
  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Snowflake Token="${token}"`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sqlText: statement,
      warehouse: warehouse,
      database: database,
      schema: schema,
      role: 'PUBLIC',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Query error response:', errorText)
    throw new Error(`Query failed: ${errorText}`)
  }

  const result = await response.json()
  
  // Check if we need to poll for results
  if (result.data?.queryId && !result.data?.rowset) {
    // Wait a bit before polling
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Poll for results
    const resultUrl = `https://${account}.snowflakecomputing.com/queries/${result.data.queryId}/result`
    const pollResponse = await fetch(resultUrl, {
      headers: {
        'Authorization': `Snowflake Token="${token}"`,
        'Accept': 'application/json',
      },
    })
    
    if (pollResponse.ok) {
      const pollResult = await pollResponse.json()
      return pollResult
    }
  }
  
  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let token: string | null = null

  try {
    // Get credentials
    const account = Deno.env.get('SNOWFLAKE_ACCOUNT') || ''
    const username = Deno.env.get('SNOWFLAKE_USERNAME') || ''
    const password = Deno.env.get('SNOWFLAKE_PASSWORD') || ''
    const warehouse = Deno.env.get('SNOWFLAKE_WAREHOUSE') || 'COMPUTE_WH'
    const database = Deno.env.get('SNOWFLAKE_DATABASE') || 'RETAIL_ANALYTICS'
    const schema = Deno.env.get('SNOWFLAKE_SCHEMA') || 'DBT_CUSTOMER'
    
    if (!account || !username || !password) {
      throw new Error('Snowflake credentials not configured')
    }

    // Authenticate
    token = await authenticateSnowflake(account, username, password)

    const { type, query, table, whereClause, limit = 100 } = await req.json() as QueryRequest
    const tableName = table || 'CUSTOMER_FACT'
    
    let result: any = {}
    let statement = ''

    switch (type) {
      case 'execute':
        if (!query) {
          throw new Error('Query parameter is required for execute type')
        }
        statement = query
        const execResult = await executeQuery(account, token, warehouse, database, schema, statement)
        result = {
          data: execResult.data?.rowset || [],
          rowCount: execResult.data?.total || 0,
        }
        break

      case 'schema':
        statement = `
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
        const schemaResult = await executeQuery(account, token, warehouse, database, schema, statement)
        const schemaData = schemaResult.data?.rowset || []
        
        result = {
          columns: schemaData.map((row: any[]) => ({
            name: row[0],
            type: row[1],
            nullable: row[2] === 'YES',
            comment: row[3] || '',
          })),
        }
        break

      case 'count':
        const orgFilter = "ORG_ID = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5'"
        const fullWhereClause = whereClause 
          ? `${orgFilter} AND (${whereClause})`
          : orgFilter
          
        statement = `
          SELECT COUNT(*) as customer_count
          FROM ${database}.${schema}.${tableName}
          WHERE ${fullWhereClause}
        `
        const countResult = await executeQuery(account, token, warehouse, database, schema, statement)
        const countData = countResult.data?.rowset || []
        
        result = {
          count: countData[0]?.[0] ? parseInt(countData[0][0]) : 0,
          whereClause: fullWhereClause,
        }
        break

      case 'preview':
        const orgFilterPreview = "ORG_ID = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5'"
        const fullWhereClausePreview = whereClause 
          ? `${orgFilterPreview} AND (${whereClause})`
          : orgFilterPreview
          
        statement = `
          SELECT *
          FROM ${database}.${schema}.${tableName}
          WHERE ${fullWhereClausePreview}
          LIMIT ${limit}
        `
        const previewResult = await executeQuery(account, token, warehouse, database, schema, statement)
        const previewData = previewResult.data?.rowset || []
        const columnNames = previewResult.data?.rowtype?.map((col: any) => col.name) || []
        
        result = {
          rows: previewData,
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
  } finally {
    // Logout if we have a token
    if (token) {
      try {
        const account = Deno.env.get('SNOWFLAKE_ACCOUNT') || ''
        await fetch(`https://${account}.snowflakecomputing.com/session/logout-request`, {
          method: 'POST',
          headers: {
            'Authorization': `Snowflake Token="${token}"`,
          },
        })
      } catch (e) {
        console.error('Logout error:', e)
      }
    }
  }
})