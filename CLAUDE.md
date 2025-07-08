# Leia Codebase Guide for AI Assistants

This guide helps AI assistants understand and work with the Leia marketing automation platform codebase.

## Project Overview

**Leia** is a POC marketing automation platform built with:
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI Integration**: OpenAI API for marketing strategist chat

## Architecture Summary

```
Frontend (React SPA)
    ↓
Supabase Client SDK
    ↓
Supabase Backend
├── PostgreSQL Database (RLS enabled)
├── Authentication (Email/Password)
└── Edge Functions (Deno runtime)
```

## Directory Structure

```
leia/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── AuthForm.tsx   # Login/signup form
│   │   ├── CampaignForm.tsx # Campaign create/edit modal
│   │   ├── SegmentForm.tsx  # Complex segment builder (542 lines)
│   │   └── ErrorBoundary.tsx # React error handling
│   ├── pages/            # Page components (modular architecture)
│   │   ├── Dashboard.tsx # Overview with stats
│   │   ├── Campaigns.tsx # Email campaigns + pagination
│   │   ├── Segments.tsx  # Customer segments + pagination
│   │   └── Chat.tsx      # AI marketing strategist
│   ├── lib/
│   │   ├── api.ts        # API layer (campaigns, segments, analytics, chat)
│   │   ├── supabase.ts   # Supabase client + TypeScript types
│   │   └── logger.ts     # Logging utility (dev: console, prod: localStorage)
│   ├── hooks/
│   │   └── useAuth.ts    # Authentication hook
│   └── App.tsx           # Main app shell (167 lines, modular)
├── supabase/
│   ├── functions/        # Edge functions (Deno)
│   │   ├── ai-chat/      # OpenAI integration
│   │   ├── campaigns/    # Campaign operations
│   │   ├── segments/     # Segment operations
│   │   ├── analytics/    # Analytics data
│   │   └── dashboard/    # Dashboard aggregations
│   └── migrations/       # Database schema
└── dist/                 # Build output

```

## Key Design Decisions

### 1. **Modular Architecture** (Refactored from monolithic)
- Each page is a separate component
- Easy to evolve features independently
- App.tsx reduced from 947 to 167 lines

### 2. **Pagination Implemented**
- Campaigns: 9 items per page
- Segments: 8 items per page
- Prevents performance issues with large datasets

### 3. **Type Safety**
- All `any` types removed from application code
- Comprehensive TypeScript interfaces for data models
- Strict mode enabled

### 4. **Error Handling**
- Global ErrorBoundary component
- Page-level error boundaries
- User-friendly error UI with reset capability

### 5. **Logging System**
- Development: Color-coded console logs
- Production: localStorage (last 100 entries)
- Context-aware with component names
- Access via `window.logger` in dev mode

## Data Models

### Campaign
```typescript
interface Campaign {
  id: string
  user_id: string
  name: string
  type: 'email' | 'sms' | 'push'
  status: 'draft' | 'active' | 'paused' | 'completed'
  subject?: string
  content: string
  target_segment?: string
  sent_count?: number
  open_rate?: number
  click_rate?: number
  revenue?: number
  created_at: string
  updated_at: string
}
```

### Segment
```typescript
interface Segment {
  id: string
  user_id: string
  name: string
  description: string
  type: 'behavioral' | 'predictive'
  criteria: Record<string, any>
  customer_count: number
  growth_rate?: number
  created_at: string
  updated_at: string
}
```

## Current State (POC)

### ✅ Implemented
- Authentication with Supabase Auth
- CRUD operations for campaigns and segments
- Real-time dashboard with stats
- AI chat integration (with fallback)
- Pagination for lists
- Error boundaries
- Comprehensive logging
- Responsive design

### ⚠️ POC Limitations (Acceptable for now)
- Hardcoded demo credentials in migrations
- Open CORS policy (`*`) in edge functions
- No rate limiting
- Mock data for analytics
- No email sending (just campaign creation)
- Basic segment filtering UI (complex but not functional)

### 🚫 Not Implemented
- Actual email delivery
- Real customer data
- Advanced analytics
- A/B testing
- Automation workflows
- Team collaboration

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run TypeScript check
npx tsc --noEmit

# Run linter
npm run lint

# Build for production
npm run build
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup
Run migrations in order:
1. `20250706013524_pink_lantern.sql` - Demo user setup
2. `20250706014722_square_king.sql` - Main schema
3. `20250706014913_silent_cliff.sql` - Sample data

## Common Tasks

### Add a New Page
1. Create component in `src/pages/NewPage.tsx`
2. Import in `App.tsx`
3. Add to navigation array
4. Add route in main content area
5. Wrap with ErrorBoundary

### Add API Endpoint
1. Create edge function in `supabase/functions/`
2. Add method to `src/lib/api.ts`
3. Use proper TypeScript types
4. Add error handling with fallback

### Improve Type Safety
1. Replace any `any` with specific interface
2. Define in `src/lib/supabase.ts`
3. Use throughout components

### Add Logging
```typescript
import { logger } from '../lib/logger'

logger.info('Action performed', { 
  component: 'ComponentName',
  userId: user.id,
  additionalContext: value 
})
```

## Performance Considerations

1. **Pagination is critical** - Without it, app crashes at ~1000 items
2. **Use Promise.all()** for parallel API calls
3. **Implement caching** for frequently accessed data
4. **Add debouncing** for search/filter inputs
5. **Consider virtual scrolling** for very long lists

## Security Notes

### Current (POC acceptable)
- Demo credentials in migrations
- CORS allows all origins
- No rate limiting
- Client-side API keys (normal for Supabase)

### For Production
- Remove hardcoded credentials
- Restrict CORS to specific domains
- Implement rate limiting
- Add request validation
- Enable Supabase RLS policies
- Use environment-specific configs

## Debugging Tips

1. **Check Logger Output**
   - Dev: Open console
   - Prod: `localStorage.getItem('app_logs')`
   - Or: `window.logger.getLogs()`

2. **Common Issues**
   - Empty lists: Check Supabase RLS policies
   - Auth errors: Verify user session
   - API failures: Check network tab
   - Type errors: Run `npx tsc --noEmit`

3. **Error Boundaries**
   - Errors show user-friendly UI
   - Stack traces visible in dev mode
   - Reset button to recover

## Future Enhancements

### High Priority
- Email service integration (SendGrid/SES)
- Real analytics with time-series DB
- Caching layer (Redis)
- Queue system for batch operations

### Medium Priority
- More sophisticated segment builder
- Campaign templates
- A/B testing framework
- Webhook integrations

### Nice to Have
- Dark mode
- Keyboard shortcuts
- Export functionality
- Mobile app

## Testing Approach

Currently manual testing. For future:
1. Unit tests with Vitest
2. Component tests with React Testing Library
3. E2E tests with Playwright
4. API tests for edge functions

## Deployment

- **Platform**: Render (static site)
- **Build**: `npm run build` → `dist/`
- **Config**: `render.yaml` for SPA routing
- **Guide**: See `DEPLOY_TO_RENDER.md`

## Code Style

- TypeScript strict mode
- Functional React components
- Tailwind for styling
- ESLint configured
- No semicolons (Prettier default)
- 2-space indentation

## Important Files

- `App.tsx` - Main application shell
- `lib/api.ts` - API integration layer
- `lib/logger.ts` - Logging utility
- `components/ErrorBoundary.tsx` - Error handling
- `DEPLOY_TO_RENDER.md` - Deployment guide

## Session Context

When starting a new session:
1. This is a POC - some shortcuts are acceptable
2. Focus on maintainability and modularity
3. Each page/feature should be independently evolvable
4. Type safety is important but not at the cost of velocity
5. Logging is crucial for debugging in POC phase

Remember: This is a rapidly iterating POC. Make pragmatic decisions that balance code quality with development speed.