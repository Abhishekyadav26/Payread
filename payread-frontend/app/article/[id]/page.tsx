"use client";
// app/article/[id]/page.tsx — Article detail: paywall + AI summary + full content

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getArticle,
  checkHasAccess,
  buildPayForArticleTx,
  signAndSubmit,
  getAllArticles,
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
      let errorMessage = "Payment failed";

      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === "object" && e !== null) {
        // Handle complex error objects
        if ("message" in e && typeof e.message === "string") {
          errorMessage = e.message;
        } else if ("error" in e && typeof e.error === "string") {
          errorMessage = e.error;
        } else if ("details" in e && typeof e.details === "string") {
          errorMessage = e.details;
        } else {
          // Try to stringify the object for debugging
          try {
            errorMessage = JSON.stringify(e);
          } catch {
            errorMessage = "Unknown payment error";
          }
        }
      } else if (typeof e === "string") {
        errorMessage = e;
      }

      console.error("Payment failed:", e);
      setError(errorMessage);
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

function LatestArticles({
  articles,
  currentArticleId,
}: {
  articles: Article[];
  currentArticleId: number;
}) {
  if (articles.length === 0) return null;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="font-serif text-[18px] font-bold text-foreground">
          Latest Articles
        </CardTitle>
        <CardDescription className="text-[13px] text-muted-foreground">
          Discover more great content from our writers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {articles.map((article) => (
          <div
            key={article.id}
            className="flex flex-col gap-2 pb-4 border-b last:border-b-0"
          >
            <Link
              href={`/article/${article.id}`}
              className="no-underline group"
            >
              <h3 className="font-serif text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {article.title}
              </h3>
            </Link>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="font-mono">
                {article.author.slice(0, 6)}…{article.author.slice(-4)}
              </span>
              <span>•</span>
              <span>{article.read_count} reads</span>
              <span>•</span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {article.price} XLM
              </Badge>
            </div>
            {article.summary && (
              <p className="text-[12px] text-muted-foreground line-clamp-2">
                {article.summary}
              </p>
            )}
          </div>
        ))}
        <div className="pt-2">
          <Link href="/" className="no-underline">
            <Button variant="outline" className="w-full">
              View All Articles →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function ArticleContent({ article }: { article: Article }) {
  const [fullContent, setFullContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      if (!article?.content_hash) {
        setContentLoading(false);
        return;
      }

      try {
        // Dynamic import to avoid SSR issues
        const { fetchFromIPFS } = await import("@/lib/ipfs");
        const content = await fetchFromIPFS(article.content_hash);
        setFullContent(content);
      } catch (error) {
        console.error("Failed to fetch content from IPFS:", error);
        setFullContent(
          "Failed to load article content. Please try again later.",
        );
      } finally {
        setContentLoading(false);
      }
    }

    fetchContent();
  }, [article?.content_hash]);

  if (!article) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Loading article content...</p>
      </div>
    );
  }

  if (contentLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-[90%]" />
        <div className="skeleton h-4 w-[95%]" />
        <div className="skeleton h-4 w-[85%]" />
        <div className="skeleton h-4 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        {/* Full Article Content */}
        <div className="text-[15px] leading-[1.9] text-foreground/90 whitespace-pre-wrap">
          {fullContent}
        </div>

        <div className="mt-8 p-4 border-l-4 border-primary bg-muted/30">
          <p className="text-sm font-medium text-foreground mb-2">
            🎉 You have permanent access
          </p>
          <p className="text-[14px] leading-[1.8] text-foreground/90">
            Your READ pass has been minted and stored in your wallet. This
            content was retrieved from IPFS using the content hash stored on the
            Stellar blockchain.
          </p>
        </div>
      </div>

      <Card className="mt-6 bg-muted/30 p-5">
        <p className="mb-1 text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
          Content Hash (IPFS CID)
        </p>
        <p className="break-all font-mono text-[12px] text-foreground">
          {article.content_hash || "Hash not available"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-2">
          This IPFS Content Identifier proves the content hasn&apos;t been
          tampered with.
        </p>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ArticlePage() {
  const params = useParams();
  const articleId = Number(params.id);
  const { address, connect: connectWallet, disconnect } = useWallet();
  const [article, setArticle] = useState<Article | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [latestArticles, setLatestArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (!address) return;
    (async () => {
      setLoading(true);
      try {
        console.log("Fetching article:", articleId, "for address:", address);
        const [a, access, latest] = await Promise.all([
          getArticle(address, articleId),
          checkHasAccess(address, address, articleId),
          getAllArticles(address),
        ]);
        console.log("Article data:", a);
        console.log("Access check:", access);
        console.log("Latest articles:", latest);
        setArticle(a);
        setHasAccess(access);

        // Filter out current article and sort by newest (highest ID first)
        const filteredLatest = latest
          .filter((art) => art.id !== articleId)
          .sort((a, b) => b.id - a.id)
          .slice(0, 5); // Show only 5 latest articles
        setLatestArticles(filteredLatest);
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
                {article.tags.map((t, i) => (
                  <Badge key={`${t}-${i}`} variant="secondary">
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

        {/* Latest Articles Section */}
        {latestArticles.length > 0 && (
          <LatestArticles
            articles={latestArticles}
            currentArticleId={articleId}
          />
        )}
      </main>
    </div>
  );
}
