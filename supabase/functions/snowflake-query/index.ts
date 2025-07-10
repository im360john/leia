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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Snowflake query function invoked')
    
    // Get Snowflake credentials from environment
    const account = Deno.env.get('SNOWFLAKE_ACCOUNT')
    const username = Deno.env.get('SNOWFLAKE_USERNAME')
    const password = Deno.env.get('SNOWFLAKE_PASSWORD')
    const warehouse = Deno.env.get('SNOWFLAKE_WAREHOUSE') || 'COMPUTE_WH'
    
    console.log('Account:', account)
    console.log('Username:', username)
    console.log('Warehouse:', warehouse)

    // Validate credentials
    if (!account || !username || !password) {
      throw new Error('Snowflake credentials not configured. Please set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, and SNOWFLAKE_PASSWORD.')
    }

    const { type, table, whereClause, limit = 100 } = await req.json() as QueryRequest
    console.log('Query type:', type)

    // For now, return mock data to test the connection
    let result: any = {}

    switch (type) {
      case 'schema':
        // Mock schema for CUSTOMER_FACT table
        result = {
          columns: [
            { name: 'CUSTOMER_ID', type: 'VARCHAR', nullable: false, comment: 'Unique customer identifier' },
            { name: 'ORG_ID', type: 'VARCHAR', nullable: false, comment: 'Organization identifier' },
            { name: 'FIRST_NAME', type: 'VARCHAR', nullable: true, comment: 'Customer first name' },
            { name: 'LAST_NAME', type: 'VARCHAR', nullable: true, comment: 'Customer last name' },
            { name: 'EMAIL', type: 'VARCHAR', nullable: true, comment: 'Customer email address' },
            { name: 'PHONE', type: 'VARCHAR', nullable: true, comment: 'Customer phone number' },
            { name: 'CUSTOMER_STATUS', type: 'VARCHAR', nullable: true, comment: 'Active/Inactive status' },
            { name: 'CREATED_AT', type: 'TIMESTAMP', nullable: true, comment: 'Account creation date' },
            { name: 'LAST_LOGIN', type: 'TIMESTAMP', nullable: true, comment: 'Last login date' },
            { name: 'LAST_VISIT_DATE', type: 'DATE', nullable: true, comment: 'Last visit date' },
            { name: 'SIGNUP_DATE', type: 'DATE', nullable: true, comment: 'Signup date' },
            { name: 'LOCATION', type: 'VARCHAR', nullable: true, comment: 'Customer location' },
            { name: 'AGE', type: 'NUMBER', nullable: true, comment: 'Customer age' },
            { name: 'GENDER', type: 'VARCHAR', nullable: true, comment: 'Customer gender' },
            { name: 'PATIENT_TYPE', type: 'VARCHAR', nullable: true, comment: 'ADULT or MEDICAL' },
            { name: 'VERIFICATION_STATUS', type: 'VARCHAR', nullable: true, comment: 'Verification status' },
            { name: 'REWARDS_BALANCE', type: 'NUMBER', nullable: true, comment: 'Current rewards balance' },
            { name: 'CUSTOMER_GROUP', type: 'VARCHAR', nullable: true, comment: 'Customer group category' },
            { name: 'TOTAL_SPENT', type: 'NUMBER', nullable: true, comment: 'Total amount spent' },
            { name: 'ORDER_COUNT', type: 'NUMBER', nullable: true, comment: 'Number of orders' },
            { name: 'LAST_ORDER_DATE', type: 'DATE', nullable: true, comment: 'Date of last order' },
            { name: 'FIRST_ORDER_DATE', type: 'DATE', nullable: true, comment: 'Date of first order' },
            { name: 'AVERAGE_ORDER_VALUE', type: 'NUMBER', nullable: true, comment: 'Average order value' }
          ]
        }
        console.log('Returning mock schema with', result.columns.length, 'columns')
        break

      case 'count':
        // Return a mock count
        const baseCount = 25000
        const reduction = whereClause ? 0.3 : 0
        const count = Math.floor(baseCount * (1 - reduction))
        
        result = {
          count: count,
          whereClause: whereClause ? `ORG_ID = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5' AND (${whereClause})` : "ORG_ID = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5'"
        }
        console.log('Returning mock count:', count)
        break

      case 'preview':
        // Return mock preview data
        result = {
          rows: [
            ['CUST001', '845b5f9a-f53f-4c43-8553-4a263b2a3bb5', 'John', 'Doe', 'john.doe@example.com', '555-0101', 'ACTIVE', '2023-01-15', '2025-01-10', '2025-01-10', '2023-01-15', 'San Francisco, CA', 35, 'Male', 'ADULT', 'VERIFIED', 1250, 'VIP', 5280.50, 24, '2025-01-08', '2023-01-20', 220.02],
            ['CUST002', '845b5f9a-f53f-4c43-8553-4a263b2a3bb5', 'Jane', 'Smith', 'jane.smith@example.com', '555-0102', 'ACTIVE', '2023-02-20', '2025-01-09', '2025-01-09', '2023-02-20', 'Los Angeles, CA', 28, 'Female', 'MEDICAL', 'VERIFIED', 800, 'REGULAR', 3450.75, 18, '2025-01-05', '2023-02-25', 191.71],
            ['CUST003', '845b5f9a-f53f-4c43-8553-4a263b2a3bb5', 'Mike', 'Johnson', 'mike.j@example.com', '555-0103', 'INACTIVE', '2023-03-10', '2024-12-15', '2024-12-15', '2023-03-10', 'Oakland, CA', 42, 'Male', 'ADULT', 'VERIFICATION_PENDING', 50, 'INDUSTRY', 1200.00, 5, '2024-11-20', '2023-03-15', 240.00]
          ],
          columns: ['CUSTOMER_ID', 'ORG_ID', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'CUSTOMER_STATUS', 'CREATED_AT', 'LAST_LOGIN', 'LAST_VISIT_DATE', 'SIGNUP_DATE', 'LOCATION', 'AGE', 'GENDER', 'PATIENT_TYPE', 'VERIFICATION_STATUS', 'REWARDS_BALANCE', 'CUSTOMER_GROUP', 'TOTAL_SPENT', 'ORDER_COUNT', 'LAST_ORDER_DATE', 'FIRST_ORDER_DATE', 'AVERAGE_ORDER_VALUE']
        }
        console.log('Returning', result.rows.length, 'preview rows')
        break

      default:
        throw new Error(`Unknown query type: ${type}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        note: 'Currently using mock data. Real Snowflake connection will be implemented once credentials are verified.'
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