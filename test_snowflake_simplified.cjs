// Simplified test to see exact error
const https = require('https')

// Test direct Snowflake connection with different endpoints
async function testSnowflakeDirect() {
  const account = 'TREEZ-INB77415'
  const username = process.env.SNOWFLAKE_USERNAME || 'test'
  const password = process.env.SNOWFLAKE_PASSWORD || 'test'
  
  // Try different API endpoints
  const endpoints = [
    { path: '/api/statements', version: 'v1' },
    { path: '/api/v2/statements', version: 'v2' },
    { path: '/queries/v1/query-request', version: 'query-api' },
  ]
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting ${endpoint.version} at ${endpoint.path}`)
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64')
    
    const options = {
      hostname: `${account}.snowflakecomputing.com`,
      port: 443,
      path: endpoint.path,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    }
    
    const body = JSON.stringify({
      statement: 'SELECT CURRENT_VERSION()',
      warehouse: 'COMPUTE_WH',
      database: 'RETAIL_ANALYTICS',
      schema: 'DBT_CUSTOMER',
      role: 'PUBLIC',
      timeout: 60,
    })
    
    await new Promise((resolve) => {
      const req = https.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`)
        console.log(`Headers:`, res.headers)
        
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          console.log('Response:', data.substring(0, 500))
          resolve()
        })
      })
      
      req.on('error', (e) => {
        console.error(`Error: ${e.message}`)
        resolve()
      })
      
      req.write(body)
      req.end()
    })
  }
}

// Also test the Supabase function
async function testViaSupabase() {
  console.log('\n\nTesting via Supabase edge function...')
  
  const SUPABASE_URL = 'https://ievsqjsqurnvsbzczuhc.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldnNxanNxdXJudnNiemN6dWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNTc3MDQsImV4cCI6MjA1MTkzMzcwNH0.OcEVcJqQ5P2OnNRCGlzl5ZrV1eaD-PUnW7Cpw9tTEqQ'
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/snowflake-query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'schema'
      })
    })

    const text = await response.text()
    console.log('Status:', response.status)
    console.log('Response:', text)
  } catch (error) {
    console.error('Error:', error)
  }
}

async function main() {
  console.log('Testing Snowflake connections...')
  console.log('Account: TREEZ-INB77415')
  console.log('=' + '='.repeat(50))
  
  await testSnowflakeDirect()
  await testViaSupabase()
}

main()