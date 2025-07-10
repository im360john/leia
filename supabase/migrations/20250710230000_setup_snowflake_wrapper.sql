-- Enable the wrappers extension
create extension if not exists wrappers with schema extensions;

-- Create the foreign data wrapper
create foreign data wrapper snowflake_wrapper
  handler snowflake_fdw_handler
  validator snowflake_fdw_validator;

-- Create server connection to Snowflake
create server snowflake_server
  foreign data wrapper snowflake_wrapper
  options (
    server 'TREEZ-INB77415.snowflakecomputing.com',
    database 'RETAIL_ANALYTICS', 
    warehouse 'COMPUTE_WH',
    role 'PUBLIC'
  );

-- Create user mapping (you'll need to update with actual credentials)
-- Note: In production, use vault to store credentials securely
create user mapping for authenticated
  server snowflake_server
  options (
    user 'your_snowflake_username',  -- TODO: Update with actual username
    password 'your_snowflake_password' -- TODO: Update with actual password
  );

-- Create schema to hold foreign tables
create schema if not exists snowflake;

-- Import the CUSTOMER_FACT table
import foreign schema "DBT_CUSTOMER"
  limit to (CUSTOMER_FACT)
  from server snowflake_server
  into snowflake;

-- Grant permissions
grant usage on schema snowflake to authenticated;
grant select on all tables in schema snowflake to authenticated;

-- Create a view that filters by ORG_ID for easier querying
create or replace view snowflake.customer_fact_filtered as
select * 
from snowflake.customer_fact
where org_id = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5';

-- Grant permission on the view
grant select on snowflake.customer_fact_filtered to authenticated;

-- Test query to verify connection (comment out if needed)
-- select count(*) from snowflake.customer_fact_filtered;