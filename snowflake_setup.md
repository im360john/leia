# Snowflake Setup Instructions

To enable real-time customer segmentation with Snowflake, you need to set the following environment variables in Supabase:

## Required Environment Variables

Run these commands to set up Snowflake credentials:

```bash
# Set your Snowflake account (e.g., "mycompany.us-west-2")
npx supabase secrets set SNOWFLAKE_ACCOUNT=your_account_identifier

# Set your Snowflake username
npx supabase secrets set SNOWFLAKE_USERNAME=your_username

# Set your Snowflake password
npx supabase secrets set SNOWFLAKE_PASSWORD=your_password

# Set your Snowflake warehouse (optional, defaults to COMPUTE_WH)
npx supabase secrets set SNOWFLAKE_WAREHOUSE=your_warehouse
```

## Example:

```bash
npx supabase secrets set SNOWFLAKE_ACCOUNT=mycompany.us-west-2
npx supabase secrets set SNOWFLAKE_USERNAME=john_doe
npx supabase secrets set SNOWFLAKE_PASSWORD=SecurePassword123!
npx supabase secrets set SNOWFLAKE_WAREHOUSE=COMPUTE_WH
```

## What's Been Implemented:

1. **Snowflake Edge Function** (`snowflake-query`):
   - Connects to your Snowflake instance
   - Queries the `RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT` table
   - Automatically filters by `ORG_ID = '845b5f9a-f53f-4c43-8553-4a263b2a3bb5'`
   - Supports schema retrieval, count queries, and preview queries

2. **Segment WHERE Clause Storage**:
   - Segments now store the Snowflake WHERE clause
   - This will be used for email targeting and analytics

3. **API Integration**:
   - Added `snowflakeAPI` to the frontend API layer
   - Methods: `getSchema()`, `getCustomerCount()`, `previewCustomers()`

## Next Steps:

1. Set the Snowflake credentials using the commands above
2. The SegmentForm component will be updated to:
   - Fetch actual column names from CUSTOMER_FACT table
   - Build WHERE clauses based on user selections
   - Show real customer counts as filters are applied
   - Save the WHERE clause with each segment

## Testing:

After setting credentials, you can test the connection by creating a new segment. The form will:
- Load real column names from your Snowflake table
- Update customer count in real-time as you add filters
- Save the WHERE clause for future use in campaigns