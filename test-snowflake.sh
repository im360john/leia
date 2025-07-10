#!/bin/bash

SUPABASE_URL="https://ievsqjsqurnvsbzczuhc.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldnNxanNxdXJudnNiemN6dWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzODcwNzYsImV4cCI6MjA1MTk2MzA3Nn0.b_zAYqLUC0x_w1njaCKGM2TUZu6z_V5IDV2oqQwmvCQ"

echo "1. Authenticating with Supabase..."
AUTH_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/token" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@treez.io",
    "password": "password123",
    "grant_type": "password"
  }')

ACCESS_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to authenticate"
  echo $AUTH_RESPONSE | jq
  exit 1
fi

echo "✓ Successfully authenticated"

echo -e "\n2. Testing count query..."
COUNT_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/snowflake-query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "count",
    "whereClause": "TOTAL_SPEND > 1000"
  }')

echo $COUNT_RESPONSE | jq

echo -e "\n3. Testing schema query..."
SCHEMA_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/snowflake-query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "schema",
    "table": "CUSTOMER_FACT"
  }')

echo $SCHEMA_RESPONSE | jq '.data.columns[0:3]'

echo -e "\n4. Testing preview query..."
PREVIEW_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/snowflake-query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preview",
    "limit": 2
  }')

echo $PREVIEW_RESPONSE | jq '.data | {columns: .columns[0:5], row_count: (.rows | length)}'