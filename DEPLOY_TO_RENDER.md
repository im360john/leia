# Deploy Leia to Render

This guide walks you through deploying the Leia marketing automation platform to Render.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
3. **GitHub Repository**: Ensure your code is pushed to GitHub

## Step 1: Set Up Supabase

1. **Create a new Supabase project**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Click "New project"
   - Choose your organization
   - Set project name: `leia-production`
   - Generate a strong database password
   - Select your region (choose closest to your users)

2. **Run database migrations**
   - Go to SQL Editor in Supabase dashboard
   - Run each migration file in order:
     ```sql
     -- Run these in order:
     -- 1. /supabase/migrations/20250706013524_pink_lantern.sql
     -- 2. /supabase/migrations/20250706014722_square_king.sql
     -- 3. /supabase/migrations/20250706014913_silent_cliff.sql
     ```

3. **Get your API credentials**
   - Go to Settings → API
   - Copy:
     - `Project URL` (your Supabase URL)
     - `anon public` key (your Supabase anon key)

4. **Set up Edge Functions** (Optional for AI Chat)
   - Install Supabase CLI locally
   - Deploy edge functions:
     ```bash
     supabase functions deploy ai-chat
     supabase functions deploy analytics
     supabase functions deploy campaigns
     supabase functions deploy dashboard
     supabase functions deploy segments
     ```
   - Set OpenAI API key:
     ```bash
     supabase secrets set OPENAI_API_KEY=your_openai_api_key
     ```

## Step 2: Deploy to Render

1. **Create a New Web Service**
   - Log in to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub account if not already connected
   - Select your `leia` repository
   - Choose the `refactor/modular-architecture` branch (or `main` if merged)

2. **Configure Build Settings**
   ```yaml
   Name: leia-app
   Environment: Static Site
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

3. **Add Environment Variables**
   Click "Advanced" and add:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Configure Headers** (for SPA routing)
   Add a `render.yaml` file to your repository:
   ```yaml
   services:
     - type: web
       name: leia-app
       env: static
       buildCommand: npm install && npm run build
       staticPublishPath: ./dist
       headers:
         - path: /*
           name: X-Frame-Options
           value: SAMEORIGIN
       routes:
         - type: rewrite
           source: /*
           destination: /index.html
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - Wait for the build to complete (usually 2-5 minutes)

## Step 3: Post-Deployment Setup

1. **Update Supabase Auth Settings**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Render URL to:
     - Site URL: `https://leia-app.onrender.com`
     - Redirect URLs: `https://leia-app.onrender.com/*`

2. **Create Initial User**
   - Visit your deployed app
   - Click "Sign Up"
   - Create your admin account
   - Check email for confirmation (if email auth is enabled)

3. **Test the Application**
   - ✅ Sign in/out
   - ✅ Create a campaign
   - ✅ Create a segment
   - ✅ Check dashboard stats
   - ✅ Test AI chat (if OpenAI key is configured)

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Custom Domain (Optional)

1. In Render Dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Add your domain (e.g., `app.leia.com`)
4. Update DNS records as instructed
5. Update Supabase redirect URLs to include your custom domain

## Monitoring & Logs

- **Application Logs**: Render Dashboard → Your Service → Logs
- **Build Logs**: Check during deployment for any errors
- **Supabase Logs**: Supabase Dashboard → Logs → Edge Functions

## Troubleshooting

### Build Fails
- Check Node version compatibility
- Ensure all dependencies are in `package.json`
- Review build logs for specific errors

### Authentication Issues
- Verify Supabase URL and anon key are correct
- Check Supabase auth settings include your Render URL
- Ensure RLS policies are properly set up

### Blank Page
- Check browser console for errors
- Verify environment variables are set
- Ensure `render.yaml` has the rewrite rule for SPA

### Performance Issues
- Enable Render's auto-scaling if needed
- Consider upgrading Supabase plan for more resources
- Implement caching strategies for frequently accessed data

## Production Checklist

- [ ] Remove demo credentials from migrations
- [ ] Set up proper CORS policies in edge functions
- [ ] Enable rate limiting on Supabase
- [ ] Set up error monitoring (Sentry, LogRocket)
- [ ] Configure backups in Supabase
- [ ] Set up custom domain with SSL
- [ ] Enable Supabase email authentication
- [ ] Review and tighten RLS policies

## Support

- **Render**: [render.com/docs](https://render.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Issues**: Create an issue in your GitHub repository

---

🚀 Your Leia app should now be live on Render!