// Direct test of Snowflake edge function
const SUPABASE_URL = 'https://ievsqjsqurnvsbzczuhc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldnNxanNxdXJudnNiemN6dWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNTc3MDQsImV4cCI6MjA1MTkzMzcwNH0.OcEVcJqQ5P2OnNRCGlzl5ZrV1eaD-PUnW7Cpw9tTEqQ'

async function testSnowflakeSchema() {
  console.log('Testing Snowflake schema retrieval...\n')
  
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

    const responseText = await response.text()
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      console.error('Error response:', responseText)
      return
    }

    const data = JSON.parse(responseText)
    console.log('\nResponse:', JSON.stringify(data, null, 2))
    
    if (data.success && data.data?.columns) {
      console.log(`\nFound ${data.data.columns.length} columns in CUSTOMER_FACT table`)
      
      // Show first 5 columns
      console.log('\nFirst 5 columns:')
      data.data.columns.slice(0, 5).forEach(col => {
        console.log(`- ${col.name} (${col.type}) ${col.nullable ? 'NULL' : 'NOT NULL'}`)
      })
    }
    
  } catch (error) {
    console.error('Request failed:', error)
  }
}

testSnowflakeSchema()