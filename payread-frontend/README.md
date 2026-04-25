# PayRead Frontend

> Decentralized pay-per-article platform built on Stellar Testnet with Next.js 16 and React 19.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- Freighter wallet extension for Stellar

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.local.example .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and connect your Freighter wallet.

## 🏗️ Architecture

![PayRead Architecture Diagram](/assets/payread-architecture.png)

### Core Pages
- **`/`** - Trending article feed with live activity sidebar
- **`/article/[id]`** - Article detail with AI summary and paywall
- **`/write`** - 3-step article publishing flow
- **`/dashboard`** - Author earnings and article management

### Key Components
- **`components/navbar.tsx`** - Navigation with wallet connection
- **`components/ui/`** - shadcn/ui component library
- **`lib/contracts/`** - Stellar contract interaction helpers
- **`lib/stellar-helper.ts`** - Wallet connection utilities

### Technology Stack
- **Next.js 16.2.4** with App Router
- **React 19.2.4** with TypeScript 5
- **Tailwind CSS 4** for styling
- **shadcn/ui** for components
- **@creit.tech/stellar-wallets-kit** for wallet integration
- **@stellar/stellar-sdk** for contract calls
- **Claude AI** for article summaries

## 🔐 Wallet Integration

The app uses Freighter wallet for Stellar Testnet interactions:

```typescript
import { connectWallet as connectStellarWallet } from '@/lib/stellar-helper';

const address = await connectStellarWallet();
```

## 📝 Contract Integration

### Contract Configuration
Update contract IDs in `lib/contracts/config.ts`:

```typescript
export const CONTRACTS = {
  CONTENT_REGISTRY: "C...",
  READ_TOKEN: "C...",
  PAYMENT_VAULT: "C...",
  TRENDING: "C...",
};
```

### Key Functions
- `getAllArticles()` - Fetch all published articles
- `payForArticle()` - Purchase access to an article
- `publishArticle()` - Publish new content
- `withdrawEarnings()` - Withdraw author balance

## 🤖 AI Integration

Claude AI generates free summaries for paid articles:

```typescript
// Called from article page
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    // ... prompt for article summary
  }),
});
```

## 🎨 UI Features

### Dark Mode Support
Built-in dark/light theme toggle using `next-themes`.

### Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly interactions

### Real-time Updates
Event streaming for live activity:
- New article publications
- Purchase notifications
- Platform statistics

## 📊 State Management

The app uses React hooks for state management:
- `useState` for local component state
- `useEffect` for data fetching and subscriptions
- Custom hooks for contract interactions

## 🔧 Development

### Available Scripts

```bash
pnpm dev      # Start development server
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

### Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_CLAUDE_API_KEY=your_claude_api_key
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically on push

### Manual Deployment
```bash
pnpm build
pnpm start
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔗 Related Projects

- **Backend Contracts**: `../Payread-contract/` - Soroban smart contracts
- **Root README**: `../readme.md` - Full project documentation

---

Built with ❤️ on Stellar Testnet · Soroban Smart Contracts·
