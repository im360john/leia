import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ievsqjsqurnvsbzczuhc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldnNxanNxdXJudnNiemN6dWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzODcwNzYsImV4cCI6MjA1MTk2MzA3Nn0.b_zAYqLUC0x_w1njaCKGM2TUZu6z_V5IDV2oqQwmvCQ'

async function testSnowflakeConnection() {
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Sign in with demo credentials
    console.log('Signing in to Supabase...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'john@treez.io',
      password: 'password123',
    })
    
    if (authError) {
      throw new Error(`Auth failed: ${authError.message}`)
    }
    
    console.log('✓ Successfully authenticated')
    console.log(`  User ID: ${authData.user?.id}`)
    console.log(`  Email: ${authData.user?.email}`)
    
    // Test 1: Get schema
    console.log('\n1. Testing schema query...')
    const { data: schemaData, error: schemaError } = await supabase.functions.invoke('snowflake-query', {
      body: { 
        type: 'schema',
        table: 'CUSTOMER_FACT'
      }
    })
    
    if (schemaError) {
      console.error('Schema query failed:', schemaError)
    } else {
      console.log('✓ Schema query successful')
      console.log(`  Columns: ${schemaData?.data?.columns?.length || 0}`)
      if (schemaData?.data?.columns?.[0]) {
        console.log(`  First column: ${schemaData.data.columns[0].name} (${schemaData.data.columns[0].type})`)
      }
    }
    
    // Test 2: Get count
    console.log('\n2. Testing count query...')
    const { data: countData, error: countError } = await supabase.functions.invoke('snowflake-query', {
      body: { 
        type: 'count',
        whereClause: 'TOTAL_SPEND > 1000'
      }
    })
    
    if (countError) {
      console.error('Count query failed:', countError)
    } else {
      console.log('✓ Count query successful')
      console.log(`  Customer count: ${countData?.data?.count || 0}`)
      console.log(`  Where clause: ${countData?.data?.whereClause}`)
    }
    
    // Test 3: Get preview
    console.log('\n3. Testing preview query...')
    const { data: previewData, error: previewError } = await supabase.functions.invoke('snowflake-query', {
      body: { 
        type: 'preview',
        limit: 5
      }
    })
    
    if (previewError) {
      console.error('Preview query failed:', previewError)
    } else {
      console.log('✓ Preview query successful')
      console.log(`  Rows returned: ${previewData?.data?.rows?.length || 0}`)
      console.log(`  Columns: ${previewData?.data?.columns?.join(', ')}`)
    }
    
    // Sign out
    await supabase.auth.signOut()
    console.log('\n✓ Signed out')
    
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

// Run the test
testSnowflakeConnection()