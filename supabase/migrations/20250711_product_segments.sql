/*
  # Create Product Segments Table

  1. New Tables
    - `product_segments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, segment name)
      - `description` (text, segment description)
      - `type` (text, segment type: behavioral, predictive)
      - `criteria` (jsonb, segment criteria)
      - `product_count` (integer, number of products in segment)
      - `growth_rate` (numeric, growth rate percentage)
      - `where_clause` (text, generated SQL WHERE clause)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on the table
    - Add policies for authenticated users to manage their own data
    - Users can only access data they own

  3. Indexes
    - Add indexes for better query performance
    - Foreign key indexes for joins
*/

-- Create product_segments table
CREATE TABLE IF NOT EXISTS public.product_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'behavioral' CHECK (type IN ('behavioral', 'predictive')),
  criteria jsonb DEFAULT '{}',
  product_count integer DEFAULT 0 NOT NULL,
  growth_rate numeric,
  where_clause text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.product_segments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_segments
CREATE POLICY "Users can view their own product segments" ON public.product_segments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product segments" ON public.product_segments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product segments" ON public.product_segments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product segments" ON public.product_segments
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS product_segments_user_id_idx ON public.product_segments(user_id);
CREATE INDEX IF NOT EXISTS product_segments_type_idx ON public.product_segments(type);
CREATE INDEX IF NOT EXISTS product_segments_created_at_idx ON public.product_segments(created_at DESC);

-- Create trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'handle_product_segments_updated_at'
  ) THEN
    CREATE TRIGGER handle_product_segments_updated_at
      BEFORE UPDATE ON public.product_segments
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;