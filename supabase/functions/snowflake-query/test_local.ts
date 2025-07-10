// Test script to debug Snowflake connection locally
import { config } from "https://deno.land/std@0.184.0/dotenv/mod.ts";

// Load environment variables
await config({ export: true });

async function testSnowflakeConnection() {
  const account = Deno.env.get('SNOWFLAKE_ACCOUNT') || 'TREEZ-INB77415';
  const username = Deno.env.get('SNOWFLAKE_USERNAME') || '';
  const password = Deno.env.get('SNOWFLAKE_PASSWORD') || '';
  
  console.log('Testing Snowflake connection...');
  console.log(`Account: ${account}`);
  console.log(`Username: ${username ? 'Set' : 'Not set'}`);
  
  // Try login endpoint first
  console.log('\n1. Testing login endpoint...');
  const loginUrl = `https://${account}.snowflakecomputing.com/session/v1/login-request`;
  
  try {
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Deno-Test/1.0',
      },
      body: JSON.stringify({
        data: {
          CLIENT_APP_ID: 'Deno-Test',
          CLIENT_APP_VERSION: '1.0',
          ACCOUNT_NAME: account,
          LOGIN_NAME: username,
          PASSWORD: password,
        }
      }),
    });
    
    console.log(`Login response status: ${loginResponse.status}`);
    const loginText = await loginResponse.text();
    
    if (loginResponse.ok) {
      const loginData = JSON.parse(loginText);
      console.log('Login successful!');
      console.log('Token:', loginData.data?.token?.substring(0, 50) + '...');
      return loginData.data?.token;
    } else {
      console.log('Login failed:', loginText);
    }
  } catch (error) {
    console.error('Login error:', error);
  }
  
  // Try basic auth
  console.log('\n2. Testing basic auth with SQL API v1...');
  const auth = btoa(`${username}:${password}`);
  const sqlUrl = `https://${account}.snowflakecomputing.com/api/statements`;
  
  try {
    const sqlResponse = await fetch(sqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Deno-Test/1.0',
      },
      body: JSON.stringify({
        statement: 'SELECT CURRENT_VERSION()',
        timeout: 60,
        warehouse: 'COMPUTE_WH',
        role: 'PUBLIC',
      }),
    });
    
    console.log(`SQL response status: ${sqlResponse.status}`);
    const sqlText = await sqlResponse.text();
    console.log('SQL response:', sqlText.substring(0, 500));
  } catch (error) {
    console.error('SQL error:', error);
  }
}

// Run the test
await testSnowflakeConnection();