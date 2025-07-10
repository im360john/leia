# Resend Email Integration Plan for Leia

## Overview
This document outlines the implementation plan for integrating Resend as the email service provider for Leia's campaign functionality.

## Implementation Steps

### High Priority Tasks

1. **Set up Resend account and obtain API key**
   - Create account at https://resend.com
   - Generate API key
   - Add to environment variables

2. **Add Resend SDK to the project dependencies**
   - Install @resend/node for edge functions
   - Install react-email for email templates

3. **Create edge function for sending emails via Resend API**
   - New edge function: `supabase/functions/send-email`
   - Handle bulk sending for campaigns
   - Return message IDs for tracking

4. **Update campaigns database schema to store message_id and email metrics**
   - Add columns: message_id, delivered_count, bounced_count
   - Create campaign_emails table for individual email tracking

5. **Create webhook endpoint to receive Resend delivery/tracking events**
   - New edge function: `supabase/functions/resend-webhook`
   - Update metrics in real-time
   - Handle events: delivered, opened, clicked, bounced

6. **Update campaign API to trigger email sending when campaign goes active**
   - Modify campaigns edge function
   - Add logic to send emails when status changes to 'active'
   - Queue emails for target segment

### Medium Priority Tasks

7. **Create React email templates using Resend's React Email components**
   - Set up email template structure
   - Create base template with Leia branding
   - Support dynamic content injection

8. **Update campaign form to include email template selection**
   - Add template picker to CampaignForm component
   - Preview functionality
   - Template variables support

9. **Implement real-time metrics updates in campaigns list view**
   - Update Campaigns.tsx to show live metrics
   - Add progress indicators for sending
   - Show delivery rates

10. **Add error handling and retry logic for failed email sends**
    - Implement exponential backoff
    - Store failed attempts
    - Admin notifications for failures

### Low Priority Tasks

11. **Create test campaign with sample customer data**
    - Generate test customer list
    - Create sample campaign
    - Verify end-to-end flow

12. **Document the email integration setup and usage**
    - API documentation
    - Template creation guide
    - Troubleshooting guide

## Technical Architecture

```
Campaign Status Change → Edge Function → Resend API
                                ↓
                         Store message_id
                                ↓
Resend Webhook → Update Metrics → Campaign Dashboard
```

## Environment Variables Needed

```env
# Frontend (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Supabase Edge Functions (set in Supabase Dashboard)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # Optional for POC
```

## Database Schema Changes

```sql
-- Add to campaigns table
ALTER TABLE campaigns ADD COLUMN message_id TEXT;
ALTER TABLE campaigns ADD COLUMN delivered_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN bounced_count INTEGER DEFAULT 0;

-- New table for individual email tracking
CREATE TABLE campaign_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  email TEXT NOT NULL,
  message_id TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Success Metrics

- Emails successfully sent when campaign activated
- Real-time tracking data flowing to dashboard
- Less than 1% failure rate on sends
- Webhook events processed within 5 seconds