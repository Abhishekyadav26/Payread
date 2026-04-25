"use client";
// app/article/[id]/page.tsx — Article detail: paywall + AI summary + full content

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getArticle,
  checkHasAccess,
  buildPayForArticleTx,
  signAndSubmit,
} from "@/lib/contracts";
import { useWallet } from "@/lib/use-wallet";
import type { Article } from "@/types";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// import { cn } from "@/lib/utils";

function shortenAddr(a: string) {
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

// ── AI Summary component (calls Claude API) ───────────────────────────────────
function AISummary({
  summary,
  articleTitle,
}: {
  summary: string;
  articleTitle: string;
}) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function generateSummary() {
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `You are a literary editor at a premium publication. Given this article teaser, write a compelling 3-sentence AI summary that makes the reader want to pay to read the full piece. Be specific, intriguing, and journalistic.

Article title: "${articleTitle}"
Teaser: "${summary}"

Write only the 3-sentence summary. No preamble.`,
            },
          ],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "Summary unavailable.";
      setAiSummary(text);
      setExpanded(true);
    } catch {
      setAiSummary("Could not generate AI summary at this time.");
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "rgba(139,47,201,0.05)",
        border: "1px solid rgba(139,47,201,0.15)",
        borderRadius: 4,
        padding: "18px 20px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: expanded ? 12 : 0,
        }}
      >
        <span className="ai-badge">✦ AI Summary</span>
        {!expanded && (
          <button
            onClick={generateSummary}
            disabled={loading}
            style={{
              fontSize: 12,
              color: "var(--accent-2)",
              background: "none",
              border: "none",
              cursor: loading ? "wait" : "pointer",
              fontFamily: "'Instrument Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            {loading ? "Generating…" : "Generate free summary →"}
          </button>
        )}
      </div>
      {expanded && aiSummary && (
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-soft)",
            lineHeight: 1.7,
            fontStyle: "italic",
          }}
        >
          {aiSummary}
        </p>
      )}
    </div>
  );
}

// ── Paywall component ─────────────────────────────────────────────────────────
function Paywall({
  article,
  address,
  onPaySuccess,
}: {
  article: Article;
  address: string;
  onPaySuccess: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handlePay() {
    setError(null);
    setPaying(true);
    try {
      console.log(
        "Starting payment for article:",
        article.id,
        "price:",
        article.price,
      );
      const xdr = await buildPayForArticleTx(
        address,
        article.id,
        article.author,
        article.price,
      );
      console.log("Transaction built, signing...");
      const hash = await signAndSubmit(xdr);
      console.log("Transaction submitted:", hash);
      setTxHash(hash);
      setTimeout(onPaySuccess, 1500);
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      console.error("Payment failed:", error);
      setError(error ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <Card className="mt-8 overflow-hidden">
      {/* Blurred preview */}
      <div className="border-b p-6 px-7">
        <p className="paywall-blur text-[15px] leading-relaxed text-muted-foreground select-none">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur.
        </p>
      </div>

      {/* Pay CTA */}
      <CardContent className="flex flex-col items-center gap-4 bg-muted/30 p-7 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-lg">
          🔒
        </div>
        <div>
          <CardTitle className="font-serif text-[18px] font-bold text-foreground">
            Continue reading for {article.price} XLM
          </CardTitle>
          <CardDescription className="text-[13px] leading-relaxed text-muted-foreground">
            One-time payment · Permanent access · No subscription
          </CardDescription>
        </div>

        <Button onClick={handlePay} disabled={paying} className="h-11 px-8">
          {paying ? "Signing in Freighter…" : `Unlock for ${article.price} XLM`}
        </Button>

        {error && (
          <p className="max-w-[360px] text-[12px] text-destructive">{error}</p>
        )}
        {txHash && (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] text-green-600 dark:text-green-400">
              ✓ Payment confirmed! Loading article…
            </p>
            <button
              onClick={onPaySuccess}
              className="text-[11px] text-blue-600 hover:text-blue-700 underline"
            >
              Check access again
            </button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Your READ pass is minted on-chain. Access is permanent and verifiable.
        </p>
      </CardContent>
    </Card>
  );
}

function ArticleContent({ article }: { article: Article }) {
  if (!article) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Loading article content...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p className="drop-cap text-[15px] leading-[1.9] text-foreground/80">
          🎉 Congratulations! You now have permanent on-chain access to this
          article. Your READ pass has been minted and stored in your wallet.
        </p>

        <div className="my-6 p-4 border-l-4 border-primary bg-muted/30">
          <p className="text-sm font-medium text-foreground mb-2">
            📖 Article Content
          </p>
          <p className="text-[14px] leading-[1.8] text-foreground/90">
            In this demo version, the full article content would typically be
            retrieved from decentralized storage (IPFS) using the content hash
            stored in the smart contract. This ensures the content remains
            immutable and censorship-resistant.
          </p>
          <p className="text-[14px] leading-[1.8] text-foreground/90 mt-3">
            The author retains full ownership of their content. No platform can
            remove it, censor it, or take away your access once you&apos;ve
            paid. Your READ pass lives permanently in your wallet, not in a
            database controlled by a company.
          </p>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            🔐 Decentralized Architecture
          </h3>
          <ul className="space-y-2 text-[14px] text-foreground/80">
            <li>• Content integrity verified by cryptographic hash</li>
            <li>• Access permissions stored on Stellar blockchain</li>
            <li>• No single point of failure or censorship</li>
            <li>• Authors maintain full ownership and control</li>
          </ul>
        </div>
      </div>

      <Card className="mt-6 bg-muted/30 p-5">
        <p className="mb-1 text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
          Content Hash (Verification)
        </p>
        <p className="break-all font-mono text-[12px] text-foreground">
          {article.content_hash || "Hash not available"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-2">
          This hash proves the content hasn&apos;t been tampered with since
          publication.
        </p>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = Number(params.id);
  const { address, connect: connectWallet, disconnect } = useWallet();
  const [article, setArticle]     = useState<Article | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    (async () => {
      setLoading(true);
      try {
        console.log("Fetching article:", articleId, "for address:", address);
        const [a, access] = await Promise.all([
          getArticle(address, articleId),
          checkHasAccess(address, address, articleId),
        ]);
        console.log("Article data:", a);
        console.log("Access check:", access);
        setArticle(a);
        setHasAccess(access);
      } catch (error) {
        console.error("Error fetching article:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [address, articleId]);

  async function handlePaySuccess() {
    if (!address) return;
    console.log("Payment successful, checking access...");
    try {
      const access = await checkHasAccess(address, address, articleId);
      console.log("Access check after payment:", access);
      setHasAccess(access);

      // If still no access, try again after a delay
      if (!access) {
        console.log("Access not granted yet, retrying in 2 seconds...");
        setTimeout(async () => {
          const retryAccess = await checkHasAccess(address, address, articleId);
          console.log("Retry access check:", retryAccess);
          setHasAccess(retryAccess);
        }, 2000);
      }
    } catch (error) {
      console.error("Error checking access after payment:", error);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        address={address}
        onConnect={connectWallet}
        onDisconnect={disconnect}
      />

      <main className="mx-auto max-w-[760px] px-6 py-12">
        {!address && (
          <Card className="page-enter p-12 text-center">
            <CardHeader>
              <CardTitle className="font-serif text-[22px] font-bold text-foreground">
                Connect to read
              </CardTitle>
              <CardDescription className="text-[13px] text-muted-foreground">
                You need a Freighter wallet to access articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={connectWallet}>Connect Freighter</Button>
            </CardContent>
          </Card>
        )}

        {address && loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="skeleton" style={{ height: 16, width: "30%" }} />
            <div className="skeleton" style={{ height: 40, width: "80%" }} />
            <div className="skeleton" style={{ height: 16, width: "50%" }} />
            <div className="skeleton" style={{ height: 80, marginTop: 16 }} />
          </div>
        )}

        {address && !loading && !article && (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--ink-muted)" }}>Article not found.</p>
          </div>
        )}

        {address && !loading && article && (
          <div className="page-enter">
            {/* Tags */}
            {article.tags?.length > 0 && (
              <div className="mb-5 flex gap-1.5">
                {article.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="mb-4 font-serif text-[38px] font-black leading-tight tracking-tight text-foreground">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="mb-7 flex items-center gap-x-4 gap-y-1 border-y py-3.5 text-[12px] text-muted-foreground">
              <span className="font-mono">{shortenAddr(article.author)}</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{article.read_count} reads</span>
              <span className="text-muted-foreground/30">·</span>
              <Badge variant="secondary" className="font-mono">
                {article.price} XLM
              </Badge>
              {hasAccess && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ✓ You own this
                  </span>
                </>
              )}
            </div>

            {/* Teaser (always visible) */}
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.75,
                color: "var(--ink-soft)",
                marginBottom: 24,
                fontStyle: "italic",
              }}
            >
              {article.summary}
            </p>

            {/* AI Summary */}
            <AISummary summary={article.summary} articleTitle={article.title} />

            <hr className="rule" style={{ marginBottom: 24 }} />

            {/* Content or paywall */}
            {hasAccess ? (
              <ArticleContent article={article} />
            ) : (
              <Paywall
                article={article}
                address={address}
                onPaySuccess={handlePaySuccess}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
