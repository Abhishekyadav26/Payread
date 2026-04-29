# ✍️ PayRead — Pay-Per-Article on Stellar Testnet

> Writers publish. Readers pay per article in XLM micropayments. No Stripe. No Substack. No middlemen.

![Stellar](https://img.shields.io/badge/Stellar-Testnet-7C3AED?style=for-the-badge&logo=stellar&logoColor=white)
![Soroban](https://img.shields.io/badge/Soroban-4%20Contracts-F59E0B?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16.2.4-000000?style=for-the-badge&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![AI Powered](https://img.shields.io/badge/Claude-AI%20Summaries-8B2FC9?style=for-the-badge)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Stellar SDK](https://img.shields.io/badge/Stellar%20SDK-12.2.0-7C3AED?style=for-the-badge&logo=stellar&logoColor=white)
![Wallets Kit](https://img.shields.io/badge/Wallets%20Kit-2.1.0-000000?style=for-the-badge)

---

## 🏗️ Contract Architecture

```
content_registry  ←──── stores articles (title, summary, price, content hash)
      │
      ↑ increment_reads (inter-contract)
      │
payment_vault ────────── holds XLM, credits author balance
      │
      ↓ mint_access (inter-contract)
      │
  read_token  ──────────── soul-bound READ passes (non-transferable)

  trending  ────────────── real-time read count scoring
```

### Inter-Contract Calls

`payment_vault.pay_for_article()` makes **2 inter-contract calls** atomically:
1. `read_token.mint_access()` — mints a soul-bound READ pass to the reader
2. `content_registry.increment_reads()` — bumps the article's read count

If either fails, the entire transaction reverts. The reader never pays without getting access.

---


## 🏗️ Architecture

![payread_architecture_diagram](https://raw.githubusercontent.com/Abhishekyadav26/Payread/refs/heads/main/payread-frontend/public/assets/payread_architecture_diagram.svg)

## 🎥 Demo Video
 [![Watch Video](https://img.youtube.com/vi/Gj0P40CgG20/0.jpg)](https://youtu.be/Gj0P40CgG20)



## 📁 Project Structure

```
Payread-contract/            ← Rust/Soroban contracts
├── contracts/
│   ├── content_registry/    post articles, get articles, track reads
│   ├── read_token/          soul-bound READ pass (non-transferable)
│   ├── payment_vault/       escrow payments, author withdrawals
│   └── trending/            read count tracker for feed sorting
└── Cargo.toml

payread-frontend/            ← Next.js frontend
├── app/
│   ├── page.tsx             Home: trending feed with live activity
│   ├── article/[id]/        Article detail: teaser + AI summary + paywall
│   ├── write/               3-step article publishing flow
│   └── dashboard/           Author earnings + withdrawal + article performance
├── components/
│   ├── ui/                  shadcn/ui components
│   └── navbar.tsx           Navigation with wallet connection
├── lib/
│   ├── contracts/           Contract interaction helpers
│   │   ├── config.ts        Contract IDs + network config
│   │   ├── registry.ts      publish, getArticle, getAllArticles
│   │   ├── vault.ts         payForArticle, withdraw, getBalance
│   │   ├── read_token.ts    hasAccess
│   │   └── trending.ts      getTrendingScore
│   ├── stellar-helper.ts    Wallet connection utilities
│   └── event-stream.ts      Real-time event polling
└── types/                   TypeScript type definitions
```

---

## 🚀 Deployment Guide

### Step 1 — Build contracts

```bash
cd Payread-contract
stellar contract build
```

### Step 2 — Deploy in order (read_token first, vault depends on it)

```bash
# 1. read_token (no dependencies)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/read_token.wasm \
  --source-account abhishek --network testnet --alias read_token

# 2. content_registry (no dependencies)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/content_registry.wasm \
  --source-account abhishek --network testnet --alias content_registry

# 3. payment_vault (depends on read_token + registry)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/payment_vault.wasm \
  --source-account abhishek --network testnet --alias payment_vault

# 4. trending (standalone)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/trending.wasm \
  --source-account abhishek --network testnet --alias trending
```

### Step 3 — Initialize (wire contracts together)

```bash
# Initialize read_token with vault address
stellar contract invoke \
  --id <READ_TOKEN_ID> --source-account abhishek --network testnet \
  -- initialize --vault <PAYMENT_VAULT_ID>

# Initialize payment_vault with read_token + registry
stellar contract invoke \
  --id <PAYMENT_VAULT_ID> --source-account abhishek --network testnet \
  -- initialize \
  --read_token <READ_TOKEN_ID> \
  --registry <CONTENT_REGISTRY_ID>

# Initialize trending with vault
stellar contract invoke \
  --id <TRENDING_ID> --source-account abhishek --network testnet \
  -- initialize --vault <PAYMENT_VAULT_ID>
```

### Step 4 — Update frontend config

```typescript
// lib/contracts/config.ts
export const CONTRACTS = {
  CONTENT_REGISTRY: "CAEFCURNFAIT3WPV6FUZVZRM3QQUU2ZIXQTEF43L6N3EJ7M3BPZGP6QO",
  READ_TOKEN:       "CAEXVRENOPXGDJTJKFC7RPOX7ODS7MUEMNQVFWT3EBTWQWCRXKHB442Q",
  PAYMENT_VAULT:    "CATRSRYNLZOBNAL465RWUSGOS6PIRQUOZUGJILQ2O77NTXUBP3QEOIUD",
  TRENDING:         "CBV6QCTUWYLP4KHKW6FMVSBX37FDIRDD2MHXET34BSHR4G2LRUDZJNSL",
};
```

### Step 5 — Run frontend

```bash
cd payread-frontend
pnpm install
pnpm run dev
```

The frontend uses:
- **Next.js 16.2.4** with React 19.2.4 and TypeScript 5
- **@creit.tech/stellar-wallets-kit v2.1.0** for wallet connections
- **@stellar/stellar-sdk v12.2.0** for contract interactions
- **shadcn/ui v4.5.0** components with Tailwind CSS 4
- **Claude AI** for article summaries
- **Soroban SDK v22.0.0** for smart contract development

---

## 🎯 Key Features

| Feature | How it works |
|---|---|
| **Pay-per-article** | Reader sends XLM → vault mints READ pass → content unlocks |
| **AI Summary** | Claude generates a free teaser so readers know what they're buying |
| **Soul-bound pass** | READ token is non-transferable — access lives in your wallet |
| **Instant earnings** | Author balance accumulates in vault, withdraw anytime |
| **Real-time feed** | Soroban event stream drives trending + live activity ticker |
| **Content hash** | SHA-256 of article stored on-chain — authenticity guaranteed |
| **No middlemen** | 0% platform fee in this MVP — all XLM goes to author |

---

## 🌐 Pages

| Route | Description |
|---|---|
| `/` | Trending feed, sort by trending/new/price, live activity sidebar |
| `/article/[id]` | Article page with free teaser, AI summary, paywall |
| `/write` | 3-step: write → preview → publish + lock content hash |
| `/dashboard` | Author stats, pending balance, withdraw XLM, article performance |

---

## 🔑 How Access Control Works

```
Reader visits /article/42
  → read_token.has_access(reader, 42)   ← check wallet's READ pass

If false → show paywall:
  → payment_vault.pay_for_article()
      → token.transfer(reader → vault)       // XLM locked
      → read_token.mint_access(reader, 42)   // READ pass minted (inter-contract)
      → registry.increment_reads(42)         // read count bumped (inter-contract)
  → has_access returns true
  → full content unlocked
```

---

## 📋 Contract Build & Deployment Log

### Build Summary

```bash
cd Payread-contract
stellar contract build
```

**content_registry.wasm** (5945 bytes)
- Wasm Hash: `82cb3915d8584cbbc44633091808e5a2452d296efae7c085fb27189c3857064d`
- Exported Functions: `get_article`, `get_by_author`, `get_count`, `increment_reads`, `publish`

**payment_vault.wasm** (4828 bytes)
- Wasm Hash: `c45fa3e87e80b6ba646d6c59ef108f3d0e48307bdb6d0ca4792bca927540373f`
- Exported Functions: `get_balance`, `initialize`, `pay_for_article`, `total_volume`, `withdraw`

**read_token.wasm** (2870 bytes)
- Wasm Hash: `23a3d7e28b7a2ba0a191db74e73f6d16a3e344e2cf8e9f46c5ef07f3842bcbce`
- Exported Functions: `has_access`, `initialize`, `mint_access`, `total_reads`

**trending.wasm** (2090 bytes)
- Wasm Hash: `28051ac5e28fcbf025f88d1625080ad8b8b418d3a6c4438d793fdd6a8eca5e5c`
- Exported Functions: `get_score`, `initialize`, `record_read`

### Deployment Commands

```bash
# 1. Deploy content_registry
stellar contract deploy \
  --wasm target/wasm32v1-none/release/content_registry.wasm \
  --source-account alice \
  --network testnet \
  --alias content_registry
# → CAEFCURNFAIT3WPV6FUZVZRM3QQUU2ZIXQTEF43L6N3EJ7M3BPZGP6QO
# 🔗 https://lab.stellar.org/r/testnet/contract/CAEFCURNFAIT3WPV6FUZVZRM3QQUU2ZIXQTEF43L6N3EJ7M3BPZGP6QO

# 2. Deploy read_token
stellar contract deploy \
  --wasm target/wasm32v1-none/release/read_token.wasm \
  --source-account alice \
  --network testnet \
  --alias read_token
# → CAEXVRENOPXGDJTJKFC7RPOX7ODS7MUEMNQVFWT3EBTWQWCRXKHB442Q
# 🔗 https://lab.stellar.org/r/testnet/contract/CAEXVRENOPXGDJTJKFC7RPOX7ODS7MUEMNQVFWT3EBTWQWCRXKHB442Q

# 3. Deploy trending
stellar contract deploy \
  --wasm target/wasm32v1-none/release/trending.wasm \
  --source-account alice \
  --network testnet \
  --alias trending
# → CBV6QCTUWYLP4KHKW6FMVSBX37FDIRDD2MHXET34BSHR4G2LRUDZJNSL
# 🔗 https://lab.stellar.org/r/testnet/contract/CBV6QCTUWYLP4KHKW6FMVSBX37FDIRDD2MHXET34BSHR4G2LRUDZJNSL

# 4. Deploy payment_vault
stellar contract deploy \
  --wasm target/wasm32v1-none/release/payment_vault.wasm \
  --source-account alice \
  --network testnet \
  --alias payment_vault
# → CATRSRYNLZOBNAL465RWUSGOS6PIRQUOZUGJILQ2O77NTXUBP3QEOIUD
# 🔗 https://lab.stellar.org/r/testnet/contract/CATRSRYNLZOBNAL465RWUSGOS6PIRQUOZUGJILQ2O77NTXUBP3QEOIUD
```

### Initialization

```bash
# Initialize read_token with vault address
stellar contract invoke \
  --id CAEXVRENOPXGDJTJKFC7RPOX7ODS7MUEMNQVFWT3EBTWQWCRXKHB442Q \
  --source-account alice \
  --network testnet \
  -- initialize \
  --vault CATRSRYNLZOBNAL465RWUSGOS6PIRQUOZUGJILQ2O77NTXUBP3QEOIUD

# Initialize payment_vault with dependencies
stellar contract invoke \
  --id CATRSRYNLZOBNAL465RWUSGOS6PIRQUOZUGJILQ2O77NTXUBP3QEOIUD \
  --source-account alice \
  --network testnet \
  -- initialize \
  --read_token CAEXVRENOPXGDJTJKFC7RPOX7ODS7MUEMNQVFWT3EBTWQWCRXKHB442Q \
  --registry CAEFCURNFAIT3WPV6FUZVZRM3QQUU2ZIXQTEF43L6N3EJ7M3BPZGP6QO \
  --trending CBV6QCTUWYLP4KHKW6FMVSBX37FDIRDD2MHXET34BSHR4G2LRUDZJNSL
```

### Environment Variables

```bash
export REGISTRY_ID="CAEFCURNFAIT3WPV6FUZVZRM3QQUU2ZIXQTEF43L6N3EJ7M3BPZGP6QO"
export READ_TOKEN_ID="CAEXVRENOPXGDJTJKFC7RPOX7ODS7MUEMNQVFWT3EBTWQWCRXKHB442Q"
export TRENDING_ID="CBV6QCTUWYLP4KHKW6FMVSBX37FDIRDD2MHXET34BSHR4G2LRUDZJNSL"
export VAULT_ID="CATRSRYNLZOBNAL465RWUSGOS6PIRQUOZUGJILQ2O77NTXUBP3QEOIUD"
```

### First Article Published

```bash
stellar contract invoke \
  --id $REGISTRY_ID \
  --source-account alice \
  --network testnet \
  -- publish \
  --author alice \
  --title "First premium post" \
  --summary "Preview text" \
  --content_hash "QmDemoHash123" \
  --price 100 \
  --tags '["news","crypto"]'

# Success - Event: [{"symbol":"Published"}] = {"vec":[{"u64":"1"},{"i128":"100"},{"string":"First premium post"}]}
```

---

## **User Feedback & Data Collection**

### **Feedback Collection Form**
We've created a comprehensive Google Form to gather user insights and improve the PayRead experience:

**[Submit Your Feedback Here](https://forms.gle/gqcY9TdYSj4bzrpq6)**

**Collected Information:**
- **Wallet Address** - For user identification and reward distribution
- **Email Address** - For follow-up communications and updates
- **Name** - Personalized user experience
- **Product Rating** - Overall satisfaction score (1-5 stars)
- **Feature Feedback** - Specific insights on payment flow, UI/UX, and functionality
- **Suggestion Box** - Ideas for future improvements and features

### **Response Analysis Dashboard**
All form responses are automatically exported and analyzed:

**[View Raw Data Sheet](https://docs.google.com/spreadsheets/d/1lIr2vs1ZPhufOBNwy5DfQzMOvAb4J7e65wNAaZEqe6E/edit?usp=sharing)**

**Analysis Metrics:**
- User satisfaction trends
- Feature usage patterns
- Common pain points
- Improvement suggestions frequency
- Demographic insights

---

## **Phase 2: Project Evolution Plan**

Based on collected user feedback and our development roadmap, here's our comprehensive improvement plan:

### **Priority 1: Enhanced User Experience**
**Target Completion:** Q2 2024  
**Git Commit Tracking:** `feature/ux-improvements`

**Planned Improvements:**
- **Simplified Wallet Connection** - One-click wallet setup with guided onboarding
- **Improved Payment Flow** - Reduced transaction confirmation time from ~30s to ~5s
- **Mobile Responsiveness** - Full mobile app experience with touch-optimized interface
- **Real-time Notifications** - Instant payment confirmations and article updates

**Implementation Status:**
- Payment flow optimization: [`[commit-link]`](https://github.com/Abhishekyadav26/Payread/commit/770fcd3fe0034ced5083df4edf48fc634ffe6a6c)
- Error handling improvements: [`[commit-link]`](https://github.com/Abhishekyadav26/Payread/commit/65b00a46f09d6725ed26d769414d47a6e06add41)
- Mobile UI enhancements: `[upcoming]`

### **Priority 2: Advanced Features**
**Target Completion:** Q3 2024  
**Git Commit Tracking:** `feature/advanced-features`

**Planned Improvements:**
- **Multi-token Support** - Enable payments in various Stellar assets (USDC, EURT, etc.)
- **Subscription Model** - Optional monthly subscriptions for unlimited reading
- **Author Analytics** - Detailed reader demographics and engagement metrics
- **Content Discovery** - AI-powered article recommendations and personalized feeds

**Implementation Status:**
- Multi-token architecture: `[in-development]`
- Subscription contract design: `[planning]`
- Analytics dashboard: `[upcoming]`

### **Priority 3: Platform Expansion**
**Target Completion:** Q4 2024  
**Git Commit Tracking:** `feature/platform-expansion`

**Planned Improvements:**
- **Mainnet Deployment** - Full production-ready Stellar mainnet integration
- **Creator Economy Tools** - Tipping, donations, and creator token support
- **Content Moderation** - Community-driven quality control system
- **API & SDK** - Third-party integration capabilities

**Implementation Status:**
- Mainnet preparation: `[research]`
- Creator token contracts: `[design]`
- API development: `[upcoming]`

### **Feedback-Driven Iterations**
**Continuous Improvement Cycle:**

1. **Data Collection** - Weekly form response analysis
2. **Prioritization** - Community voting on feature requests
3. **Development** - 2-week sprint cycles with transparent progress
4. **Testing** - Beta testing with power users
5. **Deployment** - Gradual rollout with monitoring
6. **Evaluation** - Impact assessment and iteration planning

### **Success Metrics**
**Key Performance Indicators (KPIs):**
- **User Satisfaction Score** - Target: 4.5/5 stars
- **Transaction Success Rate** - Target: 99.5%
- **Average Payment Time** - Target: <5 seconds
- **Active Authors** - Target: 100+ by Q3 2024
- **Article Read Volume** - Target: 10,000+ reads/month

### **Community Engagement**
**Ongoing Initiatives:**
- **Weekly Office Hours** - Live Q&A with development team
- **Feature Voting** - Community-driven prioritization
- **Bug Bounty Program** - Reward program for security researchers
- **Creator Grants** - Funding for high-quality content creators

---

<div align="center">
Built with <3 on Stellar Testnet · Soroban Smart Contracts·
</div>
