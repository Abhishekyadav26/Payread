# PayRead Soroban Contracts

PayRead is a multi-contract Soroban workspace for paid reading flows:
- publish paid content
- pay to unlock access
- track reads and platform volume
- maintain article trending scores

## Workspace Structure

```text
.
├── contracts
│   ├── content_registry
│   │   ├── src/lib.rs
│   │   ├── src/test.rs
│   │   └── Cargo.toml
│   ├── read_token
│   │   ├── src/lib.rs
│   │   ├── src/test.rs
│   │   └── Cargo.toml
│   ├── payment_vault
│   │   ├── src/lib.rs
│   │   ├── src/test.rs
│   │   └── Cargo.toml
│   └── trending
│       ├── src/lib.rs
│       ├── src/test.rs
│       └── Cargo.toml
├── Cargo.toml
└── README.md
```

## Contract Roles

- `content_registry`
  - Stores article metadata (title, summary, content hash, price, tags)
  - Tracks reads via `increment_reads`
  - Exposes author/article queries

- `read_token`
  - Stores access rights: `(reader, article_id) -> bool`
  - Only `payment_vault` can mint access via `mint_access`
  - Tracks total reads minted as access events

- `payment_vault`
  - Core orchestrator for purchase flow
  - Transfers payment token from reader to vault
  - Credits author withdrawable balance
  - Calls other contracts after successful payment

- `trending`
  - Stores per-article score
  - Increments score on `record_read`
  - Called by `payment_vault` after a successful payment

## How Contracts Interact

Main interaction happens in `payment_vault::pay_for_article`:
1. Reader authorizes payment.
2. Vault transfers token from reader to vault contract.
3. Vault credits author balance and updates total platform volume.
4. Vault calls `read_token.mint_access(...)`.
5. Vault calls `content_registry.increment_reads(...)`.
6. Vault calls `trending.record_read(...)`.

This gives atomic behavior: if one step fails, the transaction fails.

## Example User Flow (Read Now Button)

When user clicks **Read Now** in UI:
1. Frontend submits `pay_for_article(reader, article_id, author, price, xlm_token)` to `payment_vault`.
2. `payment_vault` executes payment + inter-contract calls.
3. Frontend checks `read_token.has_access(reader, article_id)`.
4. If `true`, frontend reveals full article content from off-chain source using `content_hash`.

## Required Initialization Order

Before purchase flow works, wire addresses:
1. `read_token.initialize(vault_address)`
2. `payment_vault.initialize(read_token_address, content_registry_address, trending_address)`

Without initialization, cross-contract calls to vault dependencies will fail.

## Build and Check

Run from repository root:

```bash
cargo check --workspace
```
