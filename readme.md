# ✍️ PayRead — Pay-Per-Article on Stellar Testnet

> Writers publish. Readers pay per article in XLM micropayments. No Stripe. No Substack. No middlemen.

![Stellar](https://img.shields.io/badge/Stellar-Testnet-7C3AED?style=for-the-badge&logo=stellar&logoColor=white)
![Soroban](https://img.shields.io/badge/Soroban-4%20Contracts-F59E0B?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs)
![AI Powered](https://img.shields.io/badge/Claude-AI%20Summaries-8B2FC9?style=for-the-badge)

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

## 📁 Project Structure

```
payread-contracts/           ← Rust/Soroban contracts
├── contracts/
│   ├── content_registry/    post articles, get articles, track reads
│   ├── read_token/          soul-bound READ pass (non-transferable)
│   ├── payment_vault/       escrow payments, author withdrawals
│   └── trending/            read count tracker for feed sorting
└── Cargo.toml

payread-frontend/            ← Next.js frontend
├── app/
│   ├── page.tsx             Home: trending feed
│   ├── article/[id]/        Article detail: teaser + AI summary + paywall
│   ├── write/               Publish an article
│   └── dashboard/           Author earnings + withdrawal
├── lib/contracts/
│   ├── config.ts            Contract IDs + network config
│   ├── registry.ts          publish, getArticle, getAllArticles
│   ├── vault.ts             payForArticle, withdraw, getBalance
│   ├── read_token.ts        hasAccess
│   └── trending.ts          getTrendingScore
└── lib/event-stream.ts      Real-time event polling
```

---

## 🚀 Deployment Guide

### Step 1 — Build contracts

```bash
cd payread-contracts
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
  CONTENT_REGISTRY: "C...",   // ← paste your deployed IDs here
  READ_TOKEN:       "C...",
  PAYMENT_VAULT:    "C...",
  TRENDING:         "C...",
};
```

### Step 5 — Run frontend

```bash
cd payread-frontend
npm install @stellar/stellar-sdk
npm run dev
```

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

<div align="center">
Built with ❤️ on Stellar Testnet · Soroban Smart Contracts · Claude AI
</div>