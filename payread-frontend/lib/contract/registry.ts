// lib/contracts/registry.ts
import * as StellarSdk from "@stellar/stellar-sdk";
import { CONTRACTS, NETWORK, XLM_TOKEN, xlmToStroops, stroopsToXlm } from "./config";
import { signTransaction } from "@/lib/stellar-helper";
import type { Article } from "@/types";

const server = () => new StellarSdk.SorobanRpc.Server(NETWORK.SOROBAN_RPC);

async function simulate(
  callerAddress: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[] = []
): Promise<StellarSdk.xdr.ScVal | null> {
  const contract = new StellarSdk.Contract(contractId);
  const account  = new StellarSdk.Account(callerAddress, "0");
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK.PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server().simulateTransaction(tx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(sim)) return null;
  return (sim as StellarSdk.SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval ?? null;
}

async function buildTx(
  callerAddress: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[]
): Promise<string> {
  const contract = new StellarSdk.Contract(contractId);
  const account  = await server().getAccount(callerAddress);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK.PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server().simulateTransaction(tx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(sim))
    throw new Error(`Sim failed: ${sim.error}`);

  return StellarSdk.SorobanRpc.assembleTransaction(
    tx,
    sim as StellarSdk.SorobanRpc.Api.SimulateTransactionSuccessResponse
  ).build().toXDR();
}

// ── Read ─────────────────────────────────────────────────────────────────────

function parseArticle(native: Record<string, unknown>): Article {
  return {
    id:           Number(native.id ?? 0),
    author:       String(native.author ?? ""),
    title:        String(native.title ?? ""),
    summary:      String(native.summary ?? ""),
    content_hash: String(native.content_hash ?? ""),
    price:        stroopsToXlm(BigInt(String(native.price ?? "0"))),
    read_count:   Number(native.read_count ?? 0),
    created_at:   Number(native.created_at ?? 0),
    tags:         (native.tags as string[]) ?? [],
  };
}

export async function getArticleCount(caller: string): Promise<number> {
  const val = await simulate(caller, CONTRACTS.CONTENT_REGISTRY, "get_count");
  if (!val) return 0;
  return Number(StellarSdk.scValToNative(val));
}

export async function getArticle(caller: string, id: number): Promise<Article | null> {
  const val = await simulate(
    caller, CONTRACTS.CONTENT_REGISTRY, "get_article",
    [StellarSdk.nativeToScVal(id, { type: "u64" })]
  );
  if (!val) return null;
  return parseArticle(StellarSdk.scValToNative(val) as Record<string, unknown>);
}

export async function getAllArticles(caller: string): Promise<Article[]> {
  const count = await getArticleCount(caller);
  const results = await Promise.all(
    Array.from({ length: count }, (_, i) => getArticle(caller, i + 1))
  );
  return results.filter(Boolean) as Article[];
}

export async function getAuthorArticleIds(caller: string, author: string): Promise<number[]> {
  const val = await simulate(
    caller, CONTRACTS.CONTENT_REGISTRY, "get_by_author",
    [StellarSdk.nativeToScVal(author, { type: "address" })]
  );
  if (!val) return [];
  return (StellarSdk.scValToNative(val) as number[]).map(Number);
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function buildPublishTx(
  author: string,
  title: string,
  summary: string,
  contentHash: string,
  priceXlm: string,
  tags: string[]
): Promise<string> {
  const priceStroops = xlmToStroops(priceXlm);
  return buildTx(author, CONTRACTS.CONTENT_REGISTRY, "publish", [
    StellarSdk.nativeToScVal(author,        { type: "address" }),
    StellarSdk.nativeToScVal(title,         { type: "string"  }),
    StellarSdk.nativeToScVal(summary,       { type: "string"  }),
    StellarSdk.nativeToScVal(contentHash,   { type: "string"  }),
    StellarSdk.nativeToScVal(priceStroops,  { type: "i128"    }),
    StellarSdk.nativeToScVal(tags,          { type: "array", values: tags.map(t => StellarSdk.nativeToScVal(t, { type: "string" })) } as never),
  ]);
}


// ── lib/contracts/vault.ts ────────────────────────────────────────────────────

export async function buildPayForArticleTx(
  reader: string,
  articleId: number,
  author: string,
  priceXlm: string
): Promise<string> {
  if (!XLM_TOKEN) {
    throw new Error("Missing NEXT_PUBLIC_XLM_TOKEN. Set your deployed asset contract ID.");
  }
  const priceStroops = xlmToStroops(priceXlm);

  return buildTx(reader, CONTRACTS.PAYMENT_VAULT, "pay_for_article", [
    StellarSdk.nativeToScVal(reader,        { type: "address" }),
    StellarSdk.nativeToScVal(articleId,     { type: "u64"     }),
    StellarSdk.nativeToScVal(author,        { type: "address" }),
    StellarSdk.nativeToScVal(priceStroops,  { type: "i128"    }),
    StellarSdk.nativeToScVal(XLM_TOKEN,     { type: "address" }),
  ]);
}

export async function buildWithdrawTx(author: string): Promise<string> {
  if (!XLM_TOKEN) {
    throw new Error("Missing NEXT_PUBLIC_XLM_TOKEN. Set your deployed asset contract ID.");
  }
  return buildTx(author, CONTRACTS.PAYMENT_VAULT, "withdraw", [
    StellarSdk.nativeToScVal(author,    { type: "address" }),
    StellarSdk.nativeToScVal(XLM_TOKEN, { type: "address" }),
  ]);
}

export async function getAuthorBalance(caller: string, author: string): Promise<string> {
  const val = await simulate(
    caller, CONTRACTS.PAYMENT_VAULT, "get_balance",
    [StellarSdk.nativeToScVal(author, { type: "address" })]
  );
  if (!val) return "0";
  return stroopsToXlm(BigInt(String(StellarSdk.scValToNative(val))));
}

export async function getPlatformVolume(caller: string): Promise<string> {
  const val = await simulate(caller, CONTRACTS.PAYMENT_VAULT, "total_volume");
  if (!val) return "0";
  return stroopsToXlm(BigInt(String(StellarSdk.scValToNative(val))));
}


// ── lib/contracts/read_token.ts ───────────────────────────────────────────────

export async function checkHasAccess(
  caller: string,
  reader: string,
  articleId: number
): Promise<boolean> {
  const val = await simulate(
    caller, CONTRACTS.READ_TOKEN, "has_access",
    [
      StellarSdk.nativeToScVal(reader,    { type: "address" }),
      StellarSdk.nativeToScVal(articleId, { type: "u64"     }),
    ]
  );
  if (!val) return false;
  return Boolean(StellarSdk.scValToNative(val));
}


// ── lib/contracts/trending.ts ─────────────────────────────────────────────────

export async function getTrendingScore(caller: string, articleId: number): Promise<number> {
  const val = await simulate(
    caller, CONTRACTS.TRENDING, "get_score",
    [StellarSdk.nativeToScVal(articleId, { type: "u64" })]
  );
  if (!val) return 0;
  return Number(StellarSdk.scValToNative(val));
}


// ── lib/event-stream.ts ───────────────────────────────────────────────────────

export type PayReadEvent =
  | { type: "Published"; articleId: number; price: string }
  | { type: "Read";      articleId: number; readCount: number }
  | { type: "Paid";      reader: string; articleId: number; amount: string }
  | { type: "Trending";  articleId: number; score: number };

export function startEventStream(
  onEvent: (e: PayReadEvent) => void,
  intervalMs = 5000
): () => void {
  let stopped    = false;
  let lastLedger = 0;

  async function poll() {
    if (stopped) return;
    try {
      const { SorobanRpc, scValToNative } = await import("@stellar/stellar-sdk");
      const server = new SorobanRpc.Server(NETWORK.SOROBAN_RPC);

      if (!lastLedger) {
        lastLedger = (await server.getLatestLedger()).sequence - 1;
      }

      const events = await server.getEvents({
        startLedger: lastLedger,
        filters: [{
          type: "contract",
          contractIds: [
            CONTRACTS.CONTENT_REGISTRY,
            CONTRACTS.PAYMENT_VAULT,
            CONTRACTS.TRENDING,
          ],
        }],
        limit: 20,
      });

      type EventRecord = { topic: StellarSdk.xdr.ScVal[]; value: StellarSdk.xdr.ScVal; ledger: number };
      const records = ((events as unknown as { records?: EventRecord[]; events?: EventRecord[] }).records
        ?? (events as unknown as { events?: EventRecord[] }).events
        ?? []) as EventRecord[];
      for (const record of records) {
        const topic  = String(scValToNative(record.topic[0]));
        const native = scValToNative(record.value) as unknown[];
        if (record.ledger > lastLedger) lastLedger = record.ledger;

        if (topic === "Published")
          onEvent({ type: "Published", articleId: Number(native[0]), price: stroopsToXlm(BigInt(String(native[1]))) });
        else if (topic === "Read")
          onEvent({ type: "Read", articleId: Number(native[0]), readCount: Number(native[1]) });
        else if (topic === "Paid")
          onEvent({ type: "Paid", reader: String(native[0]), articleId: Number(native[1]), amount: stroopsToXlm(BigInt(String(native[2]))) });
        else if (topic === "Trending")
          onEvent({ type: "Trending", articleId: Number(native[0]), score: Number(native[1]) });
      }
    } catch {}
    if (!stopped) setTimeout(poll, intervalMs);
  }

  poll();
  return () => { stopped = true; };
}


// ── lib/signAndSubmit.ts ──────────────────────────────────────────────────────

export async function signAndSubmit(xdr: string): Promise<string> {
  const { signedTxXdr } = await signTransaction(xdr);

  const { SorobanRpc, TransactionBuilder, Networks } = await import("@stellar/stellar-sdk");
  const server = new SorobanRpc.Server(NETWORK.SOROBAN_RPC);
  const tx     = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
  const send   = await server.sendTransaction(tx);

  if (send.status === "ERROR") throw new Error("Submit failed");

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await server.getTransaction(send.hash);
    if (result.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return send.hash;
    if (result.status === SorobanRpc.Api.GetTransactionStatus.FAILED)
      throw new Error("Transaction failed on-chain");
  }
  throw new Error("Confirmation timeout");
}