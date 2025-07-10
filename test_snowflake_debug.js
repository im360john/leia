// Debug Snowflake connection to see what's happening
const SUPABASE_URL = 'https://ievsqjsqurnvsbzczuhc.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function debugSnowflake() {
  console.log('Checking Snowflake function logs...\n')
  
  // First, let's see if we can get the logs from the function
  try {
    // We'll make a simple test request to see what account format is being used
    const response = await fetch(`${SUPABASE_URL}/functions/v1/snowflake-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'schema'
      })
    })

    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    // The error message should give us clues about the account format
    if (data.error) {
      // Extract the URL from the error to see what format is being used
      const urlMatch = data.error.match(/https:\/\/([^\/]+)\.snowflakecomputing\.com/)
      if (urlMatch) {
        console.log('\nSnowflake account being used:', urlMatch[1])
        console.log('\nPossible issues:')
        console.log('1. Account format might need to include region (e.g., "myaccount.us-west-2")')
        console.log('2. Account might need to be just the account name without region')
        console.log('3. Credentials might be incorrect')
        console.log('\nTry setting SNOWFLAKE_ACCOUNT to one of these formats:')
        console.log('- Just account name: "myaccount"')
        console.log('- With region: "myaccount.us-west-2"')
        console.log('- Full identifier: "abc12345.us-west-2.aws"')
      }
    }
  } catch (error) {
    console.error('Request failed:', error)
  }
}

debugSnowflake()