# Leia - AI Marketing Platform

A sophisticated AI-powered marketing platform designed for DTC brands, featuring conversational AI strategy, intelligent customer segmentation, and automated campaign management.

## 🚀 Features

- **AI Marketing Strategist**: Chat-based interface for campaign planning and marketing strategy
- **Smart Customer Segmentation**: Behavioral and predictive customer segments powered by Snowflake data
- **Campaign Management**: Create, manage, and track email marketing campaigns with Resend integration
- **Analytics Dashboard**: Comprehensive performance tracking and insights
- **Real-time Chat Interface**: Conversational AI with streaming responses powered by OpenAI

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Styling**: Tailwind CSS + Lucide Icons
- **Email**: Resend API for email delivery
- **Data**: Snowflake integration for customer data
- **AI**: OpenAI API for marketing assistant

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account (free tier works)
- (Optional) Supabase CLI for advanced setup

### 1. Clone & Install

```bash
git clone https://github.com/im360john/leia.git
cd leia
npm install
```

### 2. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these in your Supabase project settings under Settings → API.

### 3. Database Setup

The app uses Supabase for backend services. You have two options:

#### Option A: Quick Setup (Recommended for first-time users)
1. Create a new Supabase project at [app.supabase.com](https://app.supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the migrations in order from `supabase/migrations/`:
   - `20250706013524_pink_lantern.sql` - Creates demo user
   - `20250706014722_square_king.sql` - Main schema
   - `20250706014913_silent_cliff.sql` - Sample data
   - `20250710142521_email_tracking.sql` - Email tracking tables

#### Option B: CLI Setup (For developers familiar with Supabase)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
npx supabase link --project-ref your-project-ref

# Run migrations
npx supabase db push
```

### 4. Create Demo User

After running migrations, create a demo user:
1. Go to Authentication → Users in your Supabase dashboard
2. Click "Invite user"
3. Enter email: `demo@leia.com` and password: `password123`
4. Or use the signup flow in the app

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` and log in with:
- Email: `demo@leia.com`
- Password: `password123`

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npx tsc --noEmit` - Type check without building

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AuthForm.tsx     # Login/signup form
│   ├── CampaignForm.tsx # Campaign management
│   ├── SegmentForm.tsx  # Customer segment builder
│   └── ...
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Campaigns.tsx   # Campaign management
│   ├── Segments.tsx    # Customer segments
│   └── Chat.tsx        # AI chat interface
├── lib/                # Utilities & API
│   ├── api.ts          # API client
│   ├── supabase.ts     # Supabase client & types
│   └── logger.ts       # Logging utility
├── hooks/              # Custom React hooks
│   └── useAuth.ts      # Authentication hook
└── App.tsx             # Main app component

supabase/
├── functions/          # Edge functions (Deno)
│   ├── ai-chat/        # OpenAI integration
│   ├── campaigns/      # Campaign operations
│   ├── segments/       # Segment operations
│   └── ...
└── migrations/         # Database schema
```

## 🔗 Optional: Edge Functions Setup

For full functionality (AI chat, email sending, Snowflake queries), deploy the edge functions:

### Deploy All Functions
```bash
# Deploy all edge functions at once
npx supabase functions deploy --no-verify-jwt
```

### Required Environment Variables
Set these in your Supabase dashboard under Settings → Edge Functions:

```bash
# For AI Chat
OPENAI_API_KEY=your_openai_api_key

# For Email Sending
RESEND_API_KEY=your_resend_api_key

# For Snowflake (if using real data)
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=your_user
SNOWFLAKE_PRIVATE_KEY=your_private_key
SNOWFLAKE_PUBLIC_KEY_FP=your_key_fingerprint
```

## 🧪 Development Tips

### Logging
The app includes a comprehensive logging system:
- **Development**: Color-coded console logs
- **Production**: Stored in localStorage
- Access logs: `window.logger.getLogs()` in browser console

### Common Issues & Solutions

1. **Empty lists/data**: Check if you're logged in and migrations ran successfully
2. **AI chat not working**: Ensure `ai-chat` edge function is deployed with OpenAI API key
3. **Type errors**: Run `npx tsc --noEmit` to check TypeScript errors
4. **Build issues**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Testing with Mock Data
The app includes sample data after migrations. You can:
- View sample campaigns and segments
- Test the AI chat (works with fallback if no OpenAI key)
- Create new campaigns and segments
- View analytics dashboards

## 🚀 Deployment

The app is a static SPA that can be deployed to any static hosting service.

### Deploy to Render (Recommended)
1. Push your code to GitHub
2. Create a new Static Site on [Render](https://render.com)
3. Connect your GitHub repo
4. Use these settings:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Add environment variables in Render dashboard

### Deploy to Netlify
```bash
npm run build
netlify deploy --dir=dist --prod
```

### Deploy to Vercel
```bash
npm run build
vercel --prod
```

## 🔮 Next Steps

Once you have the basic app running:

1. **Customize Branding**: Update colors in `tailwind.config.js`
2. **Add Real Data**: Connect to your Snowflake/data warehouse
3. **Configure Email**: Set up Resend for production email sending
4. **Enhance AI**: Fine-tune prompts in `ai-chat` function
5. **Add Features**: Implement A/B testing, automation workflows, etc.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## ⚠️ Important Notes

- **POC Status**: This is a proof-of-concept with some production shortcuts
- **Demo Credentials**: Change the demo user password in production
- **API Keys**: Never commit API keys to version control
- **CORS**: Edge functions use open CORS (`*`) - restrict in production

---

Built with ❤️ for modern marketing teams