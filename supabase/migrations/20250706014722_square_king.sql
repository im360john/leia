/*
  # Create Marketing Platform Database Schema

  1. New Tables
    - `campaigns`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, campaign name)
      - `type` (text, campaign type: email, sms, push)
      - `subject` (text, email subject line)
      - `content` (text, campaign content)
      - `target_segment` (uuid, optional foreign key to segments)
      - `status` (text, campaign status: draft, active, paused, completed)
      - `sent_count` (integer, number of messages sent)
      - `open_rate` (numeric, open rate percentage)
      - `click_rate` (numeric, click rate percentage)
      - `revenue` (numeric, revenue generated)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `segments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, segment name)
      - `description` (text, segment description)
      - `type` (text, segment type: behavioral, demographic)
      - `criteria` (jsonb, segment criteria)
      - `customer_count` (integer, number of customers in segment)
      - `growth_rate` (numeric, growth rate percentage)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `analytics_data`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `metric_name` (text, name of the metric)
      - `metric_value` (numeric, value of the metric)
      - `period` (text, time period for the metric)
      - `date` (timestamp, date of the metric)
      - `metadata` (jsonb, additional metadata)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can only access data they own

  3. Indexes
    - Add indexes for better query performance
    - Foreign key indexes for joins
*/

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'sms', 'push')),
  subject text,
  content text NOT NULL,
  target_segment uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  sent_count integer DEFAULT 0,
  open_rate numeric DEFAULT 0,
  click_rate numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create segments table
CREATE TABLE IF NOT EXISTS public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'behavioral' CHECK (type IN ('behavioral', 'demographic')),
  criteria jsonb DEFAULT '{}',
  customer_count integer DEFAULT 0 NOT NULL,
  growth_rate numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create analytics_data table
CREATE TABLE IF NOT EXISTS public.analytics_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  period text DEFAULT '30d',
  date timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add foreign key constraint for target_segment after segments table is created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'campaigns_target_segment_fkey'
  ) THEN
    ALTER TABLE public.campaigns 
    ADD CONSTRAINT campaigns_target_segment_fkey 
    FOREIGN KEY (target_segment) REFERENCES public.segments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for segments
CREATE POLICY "Users can view their own segments" ON public.segments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own segments" ON public.segments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own segments" ON public.segments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own segments" ON public.segments
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for analytics_data
CREATE POLICY "Users can view their own analytics" ON public.analytics_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON public.analytics_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" ON public.analytics_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics" ON public.analytics_data
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON public.campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS segments_user_id_idx ON public.segments(user_id);
CREATE INDEX IF NOT EXISTS segments_type_idx ON public.segments(type);
CREATE INDEX IF NOT EXISTS segments_created_at_idx ON public.segments(created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_user_id_idx ON public.analytics_data(user_id);
CREATE INDEX IF NOT EXISTS analytics_metric_name_idx ON public.analytics_data(metric_name);
CREATE INDEX IF NOT EXISTS analytics_date_idx ON public.analytics_data(date DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'handle_campaigns_updated_at'
  ) THEN
    CREATE TRIGGER handle_campaigns_updated_at
      BEFORE UPDATE ON public.campaigns
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'handle_segments_updated_at'
  ) THEN
    CREATE TRIGGER handle_segments_updated_at
      BEFORE UPDATE ON public.segments
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;