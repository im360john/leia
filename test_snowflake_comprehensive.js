// Comprehensive test to understand Snowflake connection issues
const SUPABASE_URL = 'https://ievsqjsqurnvsbzczuhc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldnNxanNxdXJudnNiemN6dWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNTc3MDQsImV4cCI6MjA1MTkzMzcwNH0.OcEVcJqQ5P2OnNRCGlzl5ZrV1eaD-PUnW7Cpw9tTEqQ'

// First, let's test direct Snowflake API access with different formats
async function testDirectSnowflakeAPI() {
  console.log('Testing direct Snowflake API access...\n')
  
  // Get credentials from environment or use test values
  const username = process.env.SNOWFLAKE_USERNAME || 'test_user'
  const password = process.env.SNOWFLAKE_PASSWORD || 'test_pass'
  
  const accountFormats = [
    'inb77415',
    'inb77415.us-west-2.aws',
    'inb77415.us-east-1',
    'inb77415.us-east-1.aws',
    'inb77415.aws',
    'inb77415.privatelink',
  ]
  
  for (const account of accountFormats) {
    console.log(`\nTrying account format: ${account}`)
    const url = `https://${account}.snowflakecomputing.com/api/v2/statements`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          statement: 'SELECT CURRENT_VERSION()',
          timeout: 60,
          warehouse: 'COMPUTE_WH',
        }),
      })
      
      console.log(`Status: ${response.status}`)
      console.log(`Headers:`, Object.fromEntries(response.headers.entries()))
      
      if (response.status === 404) {
        console.log('-> 404 Not Found - Invalid account format')
      } else if (response.status === 401) {
        console.log('-> 401 Unauthorized - Account exists but credentials invalid')
      } else if (response.status === 403) {
        console.log('-> 403 Forbidden - Account exists but access denied')
      } else if (response.ok) {
        console.log('-> SUCCESS! This account format works')
        const data = await response.json()
        console.log('Response:', JSON.stringify(data, null, 2))
        return account
      } else {
        const text = await response.text()
        console.log(`-> Other error: ${text.substring(0, 200)}`)
      }
    } catch (error) {
      console.log(`-> Network error: ${error.message}`)
    }
  }
  
  return null
}

// Test via Supabase edge function
async function testViaSupabase() {
  console.log('\n\nTesting via Supabase edge function...\n')
  
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

    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (data.success && data.data?.columns) {
      console.log(`\nSUCCESS! Found ${data.data.columns.length} columns`)
      console.log('\nSample columns:')
      data.data.columns.slice(0, 5).forEach(col => {
        console.log(`- ${col.name} (${col.type})`)
      })
    }
  } catch (error) {
    console.error('Request failed:', error)
  }
}

// Run tests
async function main() {
  console.log('Starting comprehensive Snowflake connection test...')
  console.log('=' + '='.repeat(50))
  
  const workingFormat = await testDirectSnowflakeAPI()
  
  if (workingFormat) {
    console.log(`\n\nFound working account format: ${workingFormat}`)
    console.log('You should set SNOWFLAKE_ACCOUNT to:', workingFormat)
  } else {
    console.log('\n\nNo working account format found.')
    console.log('Please verify:')
    console.log('1. Your Snowflake account identifier')
    console.log('2. Account region (us-west-2, us-east-1, etc.)')
    console.log('3. Whether it\'s on AWS, Azure, or GCP')
    console.log('\nYou can find your account identifier in Snowflake:')
    console.log('- In the Snowflake web UI, click your account name in the top right')
    console.log('- Or run: SELECT CURRENT_ACCOUNT() in a Snowflake worksheet')
  }
  
  await testViaSupabase()
}

main()