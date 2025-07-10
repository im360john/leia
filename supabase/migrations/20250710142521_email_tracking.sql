-- Add email tracking columns to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS message_id TEXT,
ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounced_count INTEGER DEFAULT 0;

-- Create campaign_emails table for individual email tracking
CREATE TABLE IF NOT EXISTS campaign_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  message_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_emails_campaign_id ON campaign_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_message_id ON campaign_emails(message_id);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_status ON campaign_emails(status);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_email ON campaign_emails(email);

-- Enable RLS on campaign_emails
ALTER TABLE campaign_emails ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see email records for their campaigns
CREATE POLICY "Users can view their own campaign emails"
  ON campaign_emails
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Service role can manage all campaign emails
CREATE POLICY "Service role can manage all campaign emails"
  ON campaign_emails
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_emails_updated_at
  BEFORE UPDATE ON campaign_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add email template columns to campaigns table for future use
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS template_id TEXT,
ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '{}'::JSONB;

-- Create a view for campaign email statistics
CREATE OR REPLACE VIEW campaign_email_stats AS
SELECT 
  campaign_id,
  COUNT(*) AS total_emails,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) AS sent_count,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered_count,
  COUNT(CASE WHEN status = 'opened' THEN 1 END) AS opened_count,
  COUNT(CASE WHEN status = 'clicked' THEN 1 END) AS clicked_count,
  COUNT(CASE WHEN status = 'bounced' THEN 1 END) AS bounced_count,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_count,
  ROUND(
    CASE 
      WHEN COUNT(CASE WHEN status = 'sent' THEN 1 END) > 0 
      THEN (COUNT(CASE WHEN status = 'opened' THEN 1 END)::DECIMAL / COUNT(CASE WHEN status = 'sent' THEN 1 END) * 100)
      ELSE 0 
    END, 2
  ) AS open_rate,
  ROUND(
    CASE 
      WHEN COUNT(CASE WHEN status = 'opened' THEN 1 END) > 0 
      THEN (COUNT(CASE WHEN status = 'clicked' THEN 1 END)::DECIMAL / COUNT(CASE WHEN status = 'opened' THEN 1 END) * 100)
      ELSE 0 
    END, 2
  ) AS click_rate
FROM campaign_emails
GROUP BY campaign_id;

-- Grant access to the view
GRANT SELECT ON campaign_email_stats TO authenticated;