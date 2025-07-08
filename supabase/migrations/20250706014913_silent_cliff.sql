/*
  # Complete Database Schema Setup

  1. New Tables
    - `campaigns` - Email/SMS/Push marketing campaigns
    - `segments` - Customer segmentation data  
    - `analytics_data` - Performance metrics and analytics
    - `users` - Extended user profile data

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Foreign key constraints to auth.users

  3. Performance
    - Indexes on frequently queried columns
    - Optimized for dashboard queries

  4. Sample Data
    - Development data for testing (only if tables are empty)
*/

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'email',
  subject text,
  content text NOT NULL,
  target_segment uuid,
  status text NOT NULL DEFAULT 'draft',
  sent_count integer DEFAULT 0,
  open_rate numeric DEFAULT 0,
  click_rate numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT campaigns_type_check CHECK (type = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text])),
  CONSTRAINT campaigns_status_check CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text]))
);

-- Create segments table
CREATE TABLE IF NOT EXISTS segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'behavioral',
  criteria jsonb DEFAULT '{}'::jsonb,
  customer_count integer NOT NULL DEFAULT 0,
  growth_rate numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT segments_type_check CHECK (type = ANY (ARRAY['behavioral'::text, 'demographic'::text]))
);

-- Create analytics_data table
CREATE TABLE IF NOT EXISTS analytics_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  period text DEFAULT '30d',
  date timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints with proper checks
DO $$
BEGIN
  -- Add foreign key for campaigns.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'campaigns_user_id_fkey' AND table_name = 'campaigns'
  ) THEN
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for campaigns.target_segment if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'campaigns_target_segment_fkey' AND table_name = 'campaigns'
  ) THEN
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_target_segment_fkey 
    FOREIGN KEY (target_segment) REFERENCES segments(id) ON DELETE SET NULL;
  END IF;

  -- Add foreign key for segments.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'segments_user_id_fkey' AND table_name = 'segments'
  ) THEN
    ALTER TABLE segments ADD CONSTRAINT segments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for analytics_data.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'analytics_data_user_id_fkey' AND table_name = 'analytics_data'
  ) THEN
    ALTER TABLE analytics_data ADD CONSTRAINT analytics_data_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS segments_user_id_idx ON segments(user_id);
CREATE INDEX IF NOT EXISTS segments_type_idx ON segments(type);
CREATE INDEX IF NOT EXISTS segments_created_at_idx ON segments(created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_user_id_idx ON analytics_data(user_id);
CREATE INDEX IF NOT EXISTS analytics_metric_name_idx ON analytics_data(metric_name);
CREATE INDEX IF NOT EXISTS analytics_date_idx ON analytics_data(date DESC);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with proper existence checks
DO $$
BEGIN
  -- Campaigns policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Users can view their own campaigns'
  ) THEN
    CREATE POLICY "Users can view their own campaigns"
      ON campaigns
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Users can insert their own campaigns'
  ) THEN
    CREATE POLICY "Users can insert their own campaigns"
      ON campaigns
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Users can update their own campaigns'
  ) THEN
    CREATE POLICY "Users can update their own campaigns"
      ON campaigns
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Users can delete their own campaigns'
  ) THEN
    CREATE POLICY "Users can delete their own campaigns"
      ON campaigns
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Segments policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'segments' AND policyname = 'Users can view their own segments'
  ) THEN
    CREATE POLICY "Users can view their own segments"
      ON segments
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'segments' AND policyname = 'Users can insert their own segments'
  ) THEN
    CREATE POLICY "Users can insert their own segments"
      ON segments
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'segments' AND policyname = 'Users can update their own segments'
  ) THEN
    CREATE POLICY "Users can update their own segments"
      ON segments
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'segments' AND policyname = 'Users can delete their own segments'
  ) THEN
    CREATE POLICY "Users can delete their own segments"
      ON segments
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Analytics policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analytics_data' AND policyname = 'Users can view their own analytics'
  ) THEN
    CREATE POLICY "Users can view their own analytics"
      ON analytics_data
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analytics_data' AND policyname = 'Users can insert their own analytics'
  ) THEN
    CREATE POLICY "Users can insert their own analytics"
      ON analytics_data
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analytics_data' AND policyname = 'Users can update their own analytics'
  ) THEN
    CREATE POLICY "Users can update their own analytics"
      ON analytics_data
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analytics_data' AND policyname = 'Users can delete their own analytics'
  ) THEN
    CREATE POLICY "Users can delete their own analytics"
      ON analytics_data
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create triggers for updated_at timestamps with existence checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'handle_campaigns_updated_at' AND event_object_table = 'campaigns'
  ) THEN
    CREATE TRIGGER handle_campaigns_updated_at
      BEFORE UPDATE ON campaigns
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'handle_segments_updated_at' AND event_object_table = 'segments'
  ) THEN
    CREATE TRIGGER handle_segments_updated_at
      BEFORE UPDATE ON segments
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- Insert some sample data for development (optional)
DO $$
DECLARE
  sample_user_id uuid;
BEGIN
  -- Only insert sample data if tables are empty
  IF NOT EXISTS (SELECT 1 FROM campaigns LIMIT 1) THEN
    -- Get the first authenticated user or create a placeholder
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
      -- Insert sample segments
      INSERT INTO segments (user_id, name, description, type, customer_count, growth_rate) VALUES
      (sample_user_id, 'High-Value Customers', 'Customers with lifetime value > $1000', 'behavioral', 1250, 15.2),
      (sample_user_id, 'New Subscribers', 'Users who signed up in the last 30 days', 'behavioral', 890, 8.7),
      (sample_user_id, 'Mobile Users', 'Customers who primarily use mobile devices', 'demographic', 2340, 12.1);

      -- Insert sample campaigns
      INSERT INTO campaigns (user_id, name, type, subject, content, status, sent_count, open_rate, click_rate, revenue) VALUES
      (sample_user_id, 'Welcome Series', 'email', 'Welcome to our platform!', 'Thank you for joining us. Here''s what you can expect...', 'active', 1500, 28.5, 4.2, 2850.00),
      (sample_user_id, 'Product Launch', 'email', 'Introducing our latest feature', 'We''re excited to announce our new feature that will help you...', 'completed', 3200, 22.1, 3.8, 5420.00),
      (sample_user_id, 'Re-engagement', 'email', 'We miss you!', 'It''s been a while since your last visit. Here''s what''s new...', 'draft', 0, 0, 0, 0);

      -- Insert sample analytics data
      INSERT INTO analytics_data (user_id, metric_name, metric_value, period, metadata) VALUES
      (sample_user_id, 'total_revenue', 45230, '30d', '{"currency": "USD"}'),
      (sample_user_id, 'avg_open_rate', 24.5, '30d', '{"unit": "percentage"}'),
      (sample_user_id, 'total_customers', 5680, '30d', '{"active": true}'),
      (sample_user_id, 'conversion_rate', 3.2, '30d', '{"unit": "percentage"}');
    END IF;
  END IF;
END $$;