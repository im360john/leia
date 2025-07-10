# Email Tracking Migration Instructions

Since the CLI migration is having connection issues, you can apply the migration manually through the Supabase Dashboard.

## Steps to Apply Migration:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ievsqjsqurnvsbzczuhc/sql/new

2. Copy and paste the migration SQL from `supabase/migrations/20250710142521_email_tracking.sql`

3. Click "Run" to execute the migration

## What This Migration Does:

- Adds email tracking columns to the campaigns table:
  - `message_id` - Resend message ID
  - `delivered_count` - Number of delivered emails
  - `bounced_count` - Number of bounced emails
  - `template_id` - For future email template support
  - `template_variables` - For template personalization

- Creates `campaign_emails` table for individual email tracking with columns:
  - Status tracking (pending, sent, delivered, opened, clicked, bounced, failed)
  - Timestamps for each event
  - Error messages for failed sends

- Sets up Row Level Security (RLS) policies
- Creates indexes for performance
- Creates a `campaign_email_stats` view for aggregated statistics

## After Migration:

1. Add your Resend API key to Edge Function secrets:
   ```bash
   npx supabase secrets set RESEND_API_KEY=your_resend_api_key
   ```

2. Configure webhook in Resend dashboard (optional):
   - URL: `https://ievsqjsqurnvsbzczuhc.supabase.co/functions/v1/resend-webhook`

3. Test by creating a campaign and changing its status to 'active'

## Verification:

You can verify the migration was successful by checking:
- The campaigns table has the new columns
- The campaign_emails table exists
- The campaign_email_stats view is accessible

```sql
-- Check campaigns table columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('message_id', 'delivered_count', 'bounced_count');

-- Check campaign_emails table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'campaign_emails'
);

-- Check the view
SELECT * FROM campaign_email_stats LIMIT 1;
```