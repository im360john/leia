import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import snowflake from 'npm:snowflake-sdk@1.9.0'

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

// Promisify snowflake connection
function createConnection(config: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection(config)
    connection.connect((err: any, conn: any) => {
      if (err) {
        reject(err)
      } else {
        resolve(conn)
      }
    })
  })
}

// Promisify query execution
function executeQuery(connection: any, sqlText: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      complete: (err: any, stmt: any, rows: any[]) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      }
    })
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Snowflake query function invoked (SDK version)')
    
    // Get Snowflake credentials from environment
    const account = Deno.env.get('SNOWFLAKE_ACCOUNT') || ''
    const username = Deno.env.get('SNOWFLAKE_USERNAME') || ''
    const password = Deno.env.get('SNOWFLAKE_PASSWORD') || ''
    const warehouse = Deno.env.get('SNOWFLAKE_WAREHOUSE') || 'COMPUTE_WH'
    
    // Validate credentials
    if (!account || !username || !password) {
      throw new Error('Snowflake credentials not configured. Please set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, and SNOWFLAKE_PASSWORD.')
    }

    console.log(`Connecting to Snowflake account: ${account}`)
    
    // Create connection
    const connection = await createConnection({
      account,
      username,
      password,
      warehouse,
      database: 'RETAIL_ANALYTICS',
      schema: 'DBT_CUSTOMER',
    })
    
    console.log('Successfully connected to Snowflake')

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
        
        const schemaRows = await executeQuery(connection, schemaQuery)
        
        result = {
          columns: schemaRows.map((row: any) => ({
            name: row.COLUMN_NAME,
            type: row.DATA_TYPE,
            nullable: row.IS_NULLABLE === 'YES',
            comment: row.COMMENT || '',
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
        
        const countRows = await executeQuery(connection, countQuery)
        
        result = {
          count: countRows[0]?.CUSTOMER_COUNT || 0,
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
        
        const previewRows = await executeQuery(connection, previewQuery)
        
        // Extract column names from first row
        const columnNames = previewRows.length > 0 ? Object.keys(previewRows[0]) : []
        
        result = {
          rows: previewRows,
          columns: columnNames,
        }
        break

      default:
        throw new Error(`Unknown query type: ${type}`)
    }

    // Close connection
    connection.destroy()

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
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    })
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
        details: {
          name: error.name,
          code: error.code,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})