// lib/contracts/config.ts
// ── Update these after deploying ──────────────────────────────────────────────
export const CONTRACTS = {
  CONTENT_REGISTRY: "CAEFCURNFAIT3WPV6FUZVZRM3QQUU2ZIXQTEF43L6N3EJ7M3BPZGP6QO",
  READ_TOKEN:       "CAEXVRENOPXGDJTJKFC7RPOX7ODS7MUEMNQVFWT3EBTWQWCRXKHB442Q",
  PAYMENT_VAULT:    "CATRSRYNLZOBNAL465RWUSGOS6PIRQUOZUGJILQ2O77NTXUBP3QEOIUD",
  TRENDING:         "CBV6QCTUWYLP4KHKW6FMVSBX37FDIRDD2MHXET34BSHR4G2LRUDZJNSL",
} as const;

export const NETWORK = {
  PASSPHRASE:  "Test SDF Network ; September 2015",
  SOROBAN_RPC: "https://soroban-testnet.stellar.org",
  HORIZON_URL: "https://horizon-testnet.stellar.org",
  EXPLORER:    "https://stellar.expert/explorer/testnet",
} as const;

// XLM token contract address - should be set via environment variable
export const XLM_TOKEN = process.env.NEXT_PUBLIC_XLM_TOKEN || "";

export const STROOPS = BigInt(10_000_000);

export function xlmToStroops(xlm: string): bigint {
  const [whole, frac = "0"] = xlm.split(".");
  return BigInt(whole) * STROOPS + BigInt(frac.padEnd(7, "0").slice(0, 7));
}

export function stroopsToXlm(s: bigint): string {
  const whole = s / STROOPS;
  const rem   = s % STROOPS;
  const frac  = rem.toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}