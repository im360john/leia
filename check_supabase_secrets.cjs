// Check if Snowflake secrets are set in Supabase
const { execSync } = require('child_process');

try {
  console.log('Checking Supabase secrets...\n');
  
  // List all secrets (won't show values, just names)
  const output = execSync('npx supabase secrets list', { encoding: 'utf-8' });
  console.log('Available secrets:');
  console.log(output);
  
  // Check if snowflake secrets exist
  const hasSnowflakeSecrets = output.includes('SNOWFLAKE_');
  
  if (hasSnowflakeSecrets) {
    console.log('\n✓ Snowflake secrets are configured in Supabase');
    console.log('\nThe edge function should have access to:');
    if (output.includes('SNOWFLAKE_ACCOUNT')) console.log('  - SNOWFLAKE_ACCOUNT');
    if (output.includes('SNOWFLAKE_USERNAME')) console.log('  - SNOWFLAKE_USERNAME');
    if (output.includes('SNOWFLAKE_PASSWORD')) console.log('  - SNOWFLAKE_PASSWORD');
    if (output.includes('SNOWFLAKE_WAREHOUSE')) console.log('  - SNOWFLAKE_WAREHOUSE');
  } else {
    console.log('\n✗ No Snowflake secrets found');
    console.log('\nTo add them, run:');
    console.log('npx supabase secrets set SNOWFLAKE_ACCOUNT=TREEZ-INB77415');
    console.log('npx supabase secrets set SNOWFLAKE_USERNAME=your_username');
    console.log('npx supabase secrets set SNOWFLAKE_PASSWORD=your_password');
    console.log('npx supabase secrets set SNOWFLAKE_WAREHOUSE=COMPUTE_WH');
  }
} catch (error) {
  console.error('Error checking secrets:', error.message);
}