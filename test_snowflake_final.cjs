// Final test - trying different approaches
const https = require('https')

// Test 1: Direct auth endpoint test
async function testDirectAuth() {
  console.log('\n=== Testing Direct Authentication ===')
  
  const account = 'TREEZ-INB77415'
  const username = process.env.SNOWFLAKE_USERNAME || 'test'
  const password = process.env.SNOWFLAKE_PASSWORD || 'test'
  
  // Test login endpoint
  const loginData = JSON.stringify({
    data: {
      CLIENT_APP_ID: 'NodeJS-Test',
      CLIENT_APP_VERSION: '1.0',
      ACCOUNT_NAME: account,
      LOGIN_NAME: username,
      PASSWORD: password,
    }
  })
  
  const options = {
    hostname: `${account}.snowflakecomputing.com`,
    port: 443,
    path: '/session/v1/login-request',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'NodeJS-Test/1.0',
      'Content-Length': loginData.length
    }
  }
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`)
      
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data)
            console.log('SUCCESS! Got token:', result.data?.token?.substring(0, 50) + '...')
            resolve(result.data?.token)
          } catch (e) {
            console.log('Response:', data.substring(0, 500))
            resolve(null)
          }
        } else {
          console.log('Error response:', data.substring(0, 500))
          resolve(null)
        }
      })
    })
    
    req.on('error', (e) => {
      console.error(`Network error: ${e.message}`)
      resolve(null)
    })
    
    req.write(loginData)
    req.end()
  })
}

// Test 2: Simple query with basic auth
async function testBasicAuth() {
  console.log('\n=== Testing Basic Auth with Simple Query ===')
  
  const account = 'TREEZ-INB77415'
  const username = process.env.SNOWFLAKE_USERNAME || 'test'
  const password = process.env.SNOWFLAKE_PASSWORD || 'test'
  
  const query = JSON.stringify({
    statement: 'SELECT CURRENT_VERSION()',
    timeout: 60,
    warehouse: 'COMPUTE_WH',
    role: 'PUBLIC',
  })
  
  const auth = Buffer.from(`${username}:${password}`).toString('base64')
  
  const options = {
    hostname: `${account}.snowflakecomputing.com`,
    port: 443,
    path: '/api/statements',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'NodeJS-Test/1.0',
      'Content-Length': query.length
    }
  }
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`)
      
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log('Response:', data.substring(0, 500))
        resolve()
      })
    })
    
    req.on('error', (e) => {
      console.error(`Network error: ${e.message}`)
      resolve()
    })
    
    req.write(query)
    req.end()
  })
}

// Test 3: Check if account needs different format
async function testAccountFormats() {
  console.log('\n=== Testing Account URL Formats ===')
  
  const baseAccount = 'TREEZ-INB77415'
  const formats = [
    baseAccount,
    baseAccount.toLowerCase(),
    'treez-inb77415',
    'inb77415.treez',
    'inb77415',
  ]
  
  for (const account of formats) {
    console.log(`\nTrying: https://${account}.snowflakecomputing.com`)
    
    const options = {
      hostname: `${account}.snowflakecomputing.com`,
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'NodeJS-Test/1.0',
      },
      timeout: 5000
    }
    
    await new Promise((resolve) => {
      const req = https.request(options, (res) => {
        console.log(`  Status: ${res.statusCode} (${res.statusCode < 400 ? 'Valid' : 'Invalid'})`)
        resolve()
      })
      
      req.on('error', (e) => {
        console.log(`  Error: ${e.message}`)
        resolve()
      })
      
      req.on('timeout', () => {
        console.log('  Timeout')
        req.destroy()
        resolve()
      })
      
      req.end()
    })
  }
}

async function main() {
  console.log('Snowflake Connection Testing')
  console.log('============================')
  console.log('Environment check:')
  console.log(`SNOWFLAKE_USERNAME: ${process.env.SNOWFLAKE_USERNAME ? 'Set' : 'Not set'}`)
  console.log(`SNOWFLAKE_PASSWORD: ${process.env.SNOWFLAKE_PASSWORD ? 'Set' : 'Not set'}`)
  
  await testAccountFormats()
  const token = await testDirectAuth()
  await testBasicAuth()
  
  if (!token && !process.env.SNOWFLAKE_USERNAME) {
    console.log('\n\nNote: SNOWFLAKE_USERNAME and SNOWFLAKE_PASSWORD environment variables are not set.')
    console.log('Please set them and try again:')
    console.log('export SNOWFLAKE_USERNAME=your_username')
    console.log('export SNOWFLAKE_PASSWORD=your_password')
  }
}

main()