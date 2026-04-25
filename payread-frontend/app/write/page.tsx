"use client";
// app/write/page.tsx — Publish an article

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildPublishTx, signAndSubmit } from "@/lib/contracts";
<<<<<<< HEAD
import { useWallet } from "@/lib/use-wallet";
=======
import {
  connectWallet as connectStellarWallet,
  getWalletAddress,
} from "@/lib/stellar-helper";
>>>>>>> cf50cfa (wallet connection)
import { Navbar } from "@/components/navbar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PRICE_PRESETS = [
  { label: "Free taste", xlm: "0.1", desc: "0.1 XLM" },
  { label: "Short read", xlm: "0.5", desc: "0.5 XLM" },
  { label: "Deep dive", xlm: "1", desc: "1 XLM" },
  { label: "Premium", xlm: "5", desc: "5 XLM" },
];

export default function WritePage() {
  const router = useRouter();
<<<<<<< HEAD
  const { address, connect: connectWallet, disconnect } = useWallet();
=======
  const [address, setAddress] = useState<string | null>(() =>
    getWalletAddress(),
  );
>>>>>>> cf50cfa (wallet connection)

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [price, setPrice] = useState("0.5");
  const [tags, setTags] = useState("");

  const [step, setStep] = useState<"write" | "preview" | "publishing" | "done">(
    "write",
  );
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    if (!address) return;
    setError(null);
    setStep("publishing");
    try {
      const contentHash = await hashContent(content);
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const xdr = await buildPublishTx(
        address,
        title,
        summary,
        contentHash,
        price,
        tagList,
      );
      const hash = await signAndSubmit(xdr);
      setTxHash(hash);
      setStep("done");
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      setError(error ?? "Publish failed");
      setStep("preview");
    }
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        address={address}
        onConnect={connectWallet}
        onDisconnect={disconnect}
      >
        <div className="flex items-center gap-2">
          {step === "write" && title && summary && content && (
            <button onClick={() => setStep("preview")} className="btn-ghost">
              Preview →
            </button>
          )}
          {step === "preview" && (
            <>
              <button onClick={() => setStep("write")} className="btn-ghost">
                ← Edit
              </button>
              <button
                onClick={handlePublish}
                disabled={!address}
                className="btn-accent"
              >
                {address ? "Publish & Earn" : "Connect wallet first"}
              </button>
            </>
          )}
        </div>
      </Navbar>

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px" }}>
        {/* Done state */}
        {step === "done" && (
          <Card className="page-enter p-10 text-center">
            <p className="mb-4 text-5xl">🎉</p>
            <CardHeader>
              <CardTitle className="font-serif text-[28px] font-black text-foreground">
                Article Published!
              </CardTitle>
              <CardDescription className="text-[14px] leading-relaxed text-muted-foreground">
                Your article is live on Stellar Testnet. Readers can start
                paying {price} XLM to access it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {txHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-6 block break-all font-mono text-[12px] text-primary"
                >
                  View on Stellar Expert ↗
                </a>
              )}
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => router.push("/")}>
                  See Feed
                </Button>
                <Button onClick={() => router.push("/dashboard")}>
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Publishing state */}
        {step === "publishing" && (
          <div
            className="card page-enter"
            style={{ padding: "48px 40px", textAlign: "center" }}
          >
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-muted)",
                marginBottom: 8,
              }}
            >
              Waiting for Freighter signature…
            </p>
            <p
              className="font-serif"
              style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}
            >
              Publishing to Stellar Testnet
            </p>
          </div>
        )}

        {/* Write form */}
        {step === "write" && (
          <div className="page-enter flex flex-col gap-8">
            <div>
              <div className="mb-1 border-t-[3px] border-foreground pt-3.5">
                <h1 className="font-serif text-[32px] font-black tracking-tight text-foreground">
                  Write an Article
                </h1>
              </div>
              <p className="text-[13px] text-muted-foreground">
                {wordCount} words · ~{readTime} min read
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                Title *
              </label>
              <Input
                className="font-serif text-lg font-semibold"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="An unforgettable headline…"
              />
            </div>

            {/* Summary (teaser) */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                Teaser / Summary *{" "}
                <span className="font-normal lowercase">
                  (shown free before paywall)
                </span>
              </label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Hook your reader in 2–3 sentences. This is what they see before paying."
                className="min-h-[80px]"
              />
            </div>

            {/* Full content */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                Full Content *{" "}
                <span className="font-normal lowercase">
                  (locked behind paywall)
                </span>
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your full article here…"
                className="min-h-[320px] leading-relaxed"
              />
            </div>

            {/* Price presets */}
            <div>
              <label className="mb-2.5 block text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                Price (XLM) *
              </label>
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRICE_PRESETS.map((p) => (
                  <Button
                    key={p.xlm}
                    variant={price === p.xlm ? "default" : "outline"}
                    onClick={() => setPrice(p.xlm)}
                    className="h-auto flex-col px-2 py-3"
                  >
                    <div className="text-[11px] font-bold">{p.label}</div>
                    <div className="font-mono text-[10px] opacity-70">
                      {p.desc}
                    </div>
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0.01"
                step="0.1"
                placeholder="Custom XLM price"
                className="font-mono"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                Tags{" "}
                <span className="font-normal lowercase">(comma separated)</span>
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="blockchain, stellar, web3"
              />
            </div>

            <Button
              onClick={() => setStep("preview")}
              disabled={!title || !summary || !content || !price}
              className="py-6 text-sm"
            >
              Preview Article →
            </Button>
          </div>
        )}

        {/* Preview */}
        {step === "preview" && (
          <div className="page-enter">
            <div
              style={{
                background: "rgba(192,57,43,0.06)",
                border: "1px solid rgba(192,57,43,0.2)",
                borderRadius: 4,
                padding: "10px 16px",
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 12, color: "var(--accent)" }}>
                📖 Preview mode — this is how readers will see your article
              </p>
            </div>

            {tags && (
              <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                {tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
              </div>
            )}

            <h1
              className="font-serif"
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: "var(--ink)",
                letterSpacing: "-0.02em",
                marginBottom: 16,
                lineHeight: 1.15,
              }}
            >
              {title}
            </h1>

            <div
              style={{
                display: "flex",
                gap: 16,
                padding: "12px 0",
                borderTop: "1px solid var(--rule)",
                borderBottom: "1px solid var(--rule)",
                marginBottom: 24,
              }}
            >
              <span
                className="font-mono"
                style={{ fontSize: 12, color: "var(--ink-muted)" }}
              >
                {address ? `${address.slice(0, 6)}…` : "Your address"}
              </span>
              <span className="xlm-pill">{price} XLM</span>
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                {readTime} min read
              </span>
            </div>

            <p
              style={{
                fontSize: 16,
                lineHeight: 1.75,
                color: "var(--ink-soft)",
                fontStyle: "italic",
                marginBottom: 24,
              }}
            >
              {summary}
            </p>

            <hr className="rule" style={{ marginBottom: 24 }} />

            {/* Paywall preview */}
            <div
              style={{
                border: "1px solid var(--rule-dark)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <p
                  className="paywall-blur"
                  style={{
                    fontSize: 14,
                    lineHeight: 1.8,
                    color: "var(--ink-soft)",
                  }}
                >
                  {content.slice(0, 200)}…
                </p>
              </div>
              <div
                style={{
                  padding: "20px 24px",
                  background: "var(--paper)",
                  textAlign: "center",
                }}
              >
                <p
                  className="font-serif"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 4,
                  }}
                >
                  Continue reading for {price} XLM
                </p>
                <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                  This is how the paywall will appear
                </p>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(192,57,43,0.07)",
                  border: "1px solid rgba(192,57,43,0.2)",
                  borderRadius: 4,
                  marginTop: 16,
                }}
              >
                <p style={{ fontSize: 13, color: "var(--accent)" }}>{error}</p>
              </div>
            )}

            {/* Publish button in main content */}
            <div
              style={{
                marginTop: 32,
                display: "flex",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <Button
                onClick={() => setStep("write")}
                variant="outline"
                className="px-8"
              >
                ← Edit Article
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!address}
                className="px-8 py-6"
                size="lg"
              >
                {address ? "Publish & Earn XLM" : "Connect wallet first"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
