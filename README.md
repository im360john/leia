# Leia - AI Marketing Platform

A sophisticated AI-powered marketing platform designed for DTC brands, featuring conversational AI strategy, intelligent customer segmentation, and automated campaign management.

## 🚀 Features

- **AI Marketing Strategist**: Chat-based interface for campaign planning and marketing strategy
- **Smart Customer Segmentation**: Behavioral and predictive customer segments powered by AI
- **Campaign Management**: Create, manage, and track email marketing campaigns
- **Analytics Dashboard**: Comprehensive performance tracking and insights
- **Real-time Chat Interface**: Conversational AI with streaming responses and quick actions

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)
- **Build Tool**: Vite
- **Linting**: ESLint with TypeScript support

## 📦 Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd leia-ai-marketing
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── App.tsx              # Main application component
├── main.tsx            # Application entry point
├── index.css           # Global styles with Tailwind imports
└── vite-env.d.ts       # Vite type definitions

public/
├── vite.svg            # Vite logo
└── ...                 # Other static assets

config files:
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── vite.config.ts      # Vite configuration
└── eslint.config.js    # ESLint configuration
```

## 🎯 Key Components

### AI Strategist Chat
- Real-time conversational interface
- Streaming message responses
- Quick action suggestions
- Context-aware recommendations

### Campaign Management
- Campaign creation and tracking
- Performance metrics visualization
- Status management (draft, active, completed)
- Revenue and engagement analytics

### Customer Segmentation
- Behavioral segments (VIP Customers, Recent Purchasers)
- Predictive segments (At-Risk Churners, High CLV Potential)
- Growth tracking and customer counts
- Segment-based campaign targeting

### Analytics Dashboard
- Revenue tracking and trends
- Email performance metrics
- Customer lifetime value insights
- Segment performance analysis

## 🎨 Design System

The application uses a modern design system with:
- **Primary Colors**: Purple gradient (#5B21B6 to #EC4899)
- **Typography**: Inter font family
- **Spacing**: 8px grid system
- **Components**: Consistent card layouts, buttons, and interactive elements
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-optimized sidebar navigation
- Adaptive grid layouts
- Touch-friendly interactive elements
- Optimized chat interface for all screen sizes

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Deploy to Netlify
1. Build the project: `npm run build`
2. Upload the `dist/` folder to Netlify
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

## 🎭 Mock Data

The application currently uses mock data for demonstration purposes:

- **Campaigns**: Sample email campaigns with performance metrics
- **Segments**: AI-generated customer segments with growth data
- **Analytics**: Simulated performance data and trends
- **Chat Messages**: Pre-configured AI responses and suggestions

## 🔮 Future Enhancements

- **Backend Integration**: Connect to real APIs for data management
- **Authentication**: User login and multi-tenant support
- **Real AI Integration**: Connect to OpenAI or similar LLM services
- **Database**: Persistent data storage with PostgreSQL
- **Email Integration**: Klaviyo and other ESP integrations
- **E-commerce Integration**: Shopify and other platform connections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/) for fast development
- Styled with [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- Icons provided by [Lucide React](https://lucide.dev/)
- Inspired by modern AI-powered marketing platforms

---

**Note**: This is a frontend mockup/prototype. For production use, you'll need to implement backend services, authentication, and real data integrations.