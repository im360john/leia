-- Add where_clause column to segments table
ALTER TABLE segments 
ADD COLUMN IF NOT EXISTS where_clause TEXT,
ADD COLUMN IF NOT EXISTS last_count_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_customer_count INTEGER;