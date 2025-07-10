# Snowflake Foreign Data Wrapper Setup Guide

This guide explains how to set up the Snowflake FDW (Foreign Data Wrapper) in Supabase to query Snowflake data directly from your Postgres database.

## Benefits of Using FDW

1. **Direct SQL Access**: Query Snowflake tables using regular PostgreSQL SQL
2. **No Authentication Complexity**: Credentials are stored securely in the database
3. **Better Performance**: No edge function overhead
4. **Simpler Code**: Use Supabase client directly, no custom API needed
5. **Real-time Data**: Always queries live Snowflake data

## Setup Instructions

### 1. Enable Wrappers Extension

In the Supabase Dashboard SQL Editor, run:

```sql
create extension if not exists wrappers with schema extensions;
```

### 2. Update Migration with Your Credentials

Edit the migration file `/supabase/migrations/20250710230000_setup_snowflake_wrapper.sql` and update these lines with your actual Snowflake credentials:

```sql
-- Update these values:
create user mapping for authenticated
  server snowflake_server
  options (
    user 'your_actual_snowflake_username',     -- <-- Update this
    password 'your_actual_snowflake_password'  -- <-- Update this
  );
```

### 3. Run the Migration

```bash
npx supabase db push
```

### 4. Verify the Setup

In Supabase SQL Editor, test the connection:

```sql
-- Check if foreign table was created
SELECT * FROM snowflake.customer_fact_filtered LIMIT 5;

-- Get count of customers
SELECT COUNT(*) FROM snowflake.customer_fact_filtered;
```

### 5. Update the API (Optional)

Once the FDW is working, update `src/lib/api.ts` to use direct queries:

```typescript
// Example: Get customer count with WHERE clause
async getCustomerCount(whereClause?: string): Promise<{ count: number }> {
  const { count, error } = await supabase
    .from('snowflake.customer_fact_filtered')
    .select('*', { count: 'exact', head: true })
    .filter('raw_sql', whereClause || '1=1')
  
  if (error) throw error
  return { count: count || 0 }
}
```

## Using the FDW in Your App

### Direct Queries

```typescript
// Get customers from California
const { data, error } = await supabase
  .from('snowflake.customer_fact_filtered')
  .select('*')
  .eq('state', 'CA')
  .limit(10)
```

### With Raw SQL

```typescript
// Complex queries
const { data, error } = await supabase.rpc('execute_query', {
  query: `
    SELECT state, COUNT(*) as customer_count
    FROM snowflake.customer_fact_filtered
    WHERE total_spent > 1000
    GROUP BY state
    ORDER BY customer_count DESC
  `
})
```

## Troubleshooting

### Connection Issues

1. **Invalid credentials**: Double-check username/password
2. **Network access**: Ensure Supabase can reach Snowflake (check firewall rules)
3. **Account format**: The account should be `TREEZ-INB77415` (case-insensitive)

### Performance

1. **Add indexes**: Create indexes on frequently queried columns
2. **Use materialized views**: For complex aggregations
3. **Limit data transfer**: Always use WHERE clauses and LIMIT

### Security

1. **Use Vault for production**: Store credentials in Supabase Vault
2. **Row Level Security**: Add RLS policies to foreign tables
3. **Minimal permissions**: Grant Snowflake user only SELECT on needed tables

## Alternative: Create a Function

If you need more control, create a PL/pgSQL function:

```sql
CREATE OR REPLACE FUNCTION get_customer_count(where_clause TEXT DEFAULT NULL)
RETURNS TABLE(count BIGINT, where_applied TEXT) AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT COUNT(*), %L FROM snowflake.customer_fact_filtered %s',
    where_clause,
    CASE WHEN where_clause IS NOT NULL 
      THEN 'WHERE ' || where_clause 
      ELSE '' 
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then use it in your app:

```typescript
const { data, error } = await supabase
  .rpc('get_customer_count', { 
    where_clause: "state = 'CA' AND total_spent > 1000" 
  })
```

## Next Steps

1. Run the migration with your credentials
2. Test the connection
3. Update the segment builder to query real data
4. Remove the mock data from the API

The FDW approach is much simpler than edge functions for this use case!