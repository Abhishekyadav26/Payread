"use client";
// app/page.tsx — PayRead home: trending article feed

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllArticles, getTrendingScore, getPlatformVolume, startEventStream } from "@/lib/contracts";
import { useWallet } from "@/lib/use-wallet";
import type { ArticleWithAccess } from "@/types";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function shortenAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Navbar ────────────────────────────────────────────────────────────────────

// ── Article card ──────────────────────────────────────────────────────────────
function ArticleCard({
  article,
  rank,
}: {
  article: ArticleWithAccess;
  rank?: number;
}) {
  return (
    <Link href={`/article/${article.id}`} className="no-underline">
      <Card className="transition-all hover:border-primary/50">
        <CardContent className="flex gap-5 p-6">
          {/* Rank number */}
          {rank !== undefined && (
            <div className="flex w-9 shrink-0 flex-col font-serif text-[28px] font-black leading-none text-muted-foreground/30">
              {String(rank).padStart(2, "0")}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Tags */}
            {article.tags?.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {article.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Title */}
            <h2 className="mb-2 truncate font-serif text-[20px] font-bold leading-tight text-foreground">
              {article.title}
            </h2>

            {/* Summary teaser */}
            <p className="mb-3.5 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">
              {article.summary}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="font-mono">{shortenAddr(article.author)}</span>
              <span>·</span>
              <span>{timeAgo(article.created_at)}</span>
              <span>·</span>
              <span>{article.read_count} reads</span>
              {article.trendingScore !== undefined &&
                article.trendingScore > 0 && (
                  <>
                    <span>·</span>
                    <span className="font-semibold text-primary">
                      🔥 {article.trendingScore}
                    </span>
                  </>
                )}
            </div>
          </div>

          {/* Price */}
          <div className="flex shrink-0 flex-col items-end justify-between">
            <Badge className="bg-primary px-2 py-1 font-mono text-[12px] text-primary-foreground">
              {article.price} XLM
            </Badge>
            {article.hasAccess && (
              <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                ✓ Owned
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { address, connect: connectWallet, disconnect } = useWallet();
  const [articles, setArticles]   = useState<ArticleWithAccess[]>([]);
  const [volume, setVolume]       = useState("0");
  const [loading, setLoading]     = useState(false);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"trending" | "new" | "price">(
    "trending",
  );

  // Fetch articles when address changes
  useEffect(() => {
    if (!address) return;
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const all = await getAllArticles(address);
        const withScores = await Promise.all(
          all.map(async (a) => ({
            ...a,
            hasAccess: false, // read_token check here
            trendingScore: await getTrendingScore(address, a.id),
          })),
        );
        setArticles(withScores);
        const vol = await getPlatformVolume(address);
        setVolume(vol);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [address]);

  // Real-time event stream
  useEffect(() => {
    if (!address) return;
    const stop = startEventStream((event) => {
      if (event.type === "Published") {
        setLiveEvents((prev) => [
          `New article published! 📖`,
          ...prev.slice(0, 4),
        ]);
        // Refetch articles on new publication
        (async () => {
          setLoading(true);
          try {
            const all = await getAllArticles(address);
            const withScores = await Promise.all(
              all.map(async (a) => ({
                ...a,
                hasAccess: false,
                trendingScore: await getTrendingScore(address, a.id),
              })),
            );
            setArticles(withScores);
          } finally {
            setLoading(false);
          }
        })();
      }
      if (event.type === "Paid") {
        setLiveEvents((prev) => [
          `Someone just unlocked an article ⚡`,
          ...prev.slice(0, 4),
        ]);
      }
    });
    return stop;
  }, [address]);

  const sorted = [...articles].sort((a, b) => {
    if (sortBy === "trending")
      return (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
    if (sortBy === "new") return b.created_at - a.created_at;
    if (sortBy === "price") return parseFloat(a.price) - parseFloat(b.price);
    return 0;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar address={address} onConnect={connectWallet} onDisconnect={disconnect} />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 40,
            alignItems: "start",
          }}
        >
          {/* Left: article feed */}
          <div>
            {/* Masthead */}
            <div className="page-enter mb-8">
              <div className="mb-2 border-t-[3px] border-foreground pt-4">
                <h1 className="font-serif text-[42px] font-black leading-none tracking-tight text-foreground">
                  Today`s Reading
                </h1>
              </div>
              <p className="text-[13px] italic text-muted-foreground">
                Pay-per-article · Micropayments on Stellar · No middlemen
              </p>
            </div>

            {/* Sort tabs */}
            <div
              style={{
                display: "flex",
                gap: 0,
                marginBottom: 24,
                borderBottom: "1px solid var(--rule)",
              }}
            >
              {[
                { id: "trending", label: "🔥 Trending" },
                { id: "new", label: "⚡ Newest" },
                { id: "price", label: "💰 Cheapest" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id as typeof sortBy)}
                  style={{
                    fontSize: 12,
                    fontWeight: sortBy === s.id ? 600 : 400,
                    color: sortBy === s.id ? "var(--ink)" : "var(--ink-muted)",
                    background: "none",
                    border: "none",
                    borderBottom:
                      sortBy === s.id
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                    padding: "10px 16px",
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                    fontFamily: "'Instrument Sans', sans-serif",
                    transition: "color 0.15s",
                    marginBottom: -1,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* No wallet */}
            {!address && (
              <Card className="p-12 text-center">
                <CardHeader>
                  <CardTitle className="font-serif text-[24px] font-bold text-foreground">
                    Read. Pay. Own.
                  </CardTitle>
                  <CardDescription className="text-[14px] leading-relaxed text-muted-foreground">
                    Connect your Freighter wallet to browse articles.
                    <br />
                    Pay as little as 0.1 XLM per article.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={connectWallet} className="px-8">
                    Connect Freighter Wallet
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Skeletons */}
            {address && loading && (
              <div
                className="stagger"
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="card"
                    style={{ padding: "24px 28px", display: "flex", gap: 20 }}
                  >
                    <div
                      className="skeleton"
                      style={{ width: 36, height: 36, flexShrink: 0 }}
                    />
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        className="skeleton"
                        style={{ height: 14, width: "40%" }}
                      />
                      <div
                        className="skeleton"
                        style={{ height: 20, width: "85%" }}
                      />
                      <div
                        className="skeleton"
                        style={{ height: 14, width: "70%" }}
                      />
                      <div
                        className="skeleton"
                        style={{ height: 12, width: "50%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {address && !loading && sorted.length === 0 && (
              <div
                className="card"
                style={{ padding: "48px 32px", textAlign: "center" }}
              >
                <p
                  className="font-serif"
                  style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}
                >
                  No articles yet
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-muted)",
                    marginBottom: 20,
                  }}
                >
                  Be the first writer on PayRead
                </p>
                <Link href="/write">
                  <button className="btn-primary">Write First Article</button>
                </Link>
              </div>
            )}

            {/* Article list */}
            {address && !loading && sorted.length > 0 && (
              <div
                className="stagger"
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {sorted.map((article, i) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    rank={i + 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              position: "sticky",
              top: 88,
            }}
          >
            {/* Platform stats */}
            <Card className="p-0">
              <CardHeader className="px-5 py-3 border-b">
                <CardTitle className="font-serif text-[13px] font-bold text-foreground">
                  Platform Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-4">
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: "Total Articles", value: articles.length },
                    {
                      label: "Total Reads",
                      value: articles.reduce((s, a) => s + a.read_count, 0),
                    },
                    {
                      label: "Volume (XLM)",
                      value: parseFloat(volume).toFixed(2),
                    },
                  ].map((s) => (
                    <div key={s.label} className="flex justify-between">
                      <span className="text-[12px] text-muted-foreground">
                        {s.label}
                      </span>
                      <span className="font-mono text-[12px] font-medium text-foreground">
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Live events ticker */}
            {liveEvents.length > 0 && (
              <Card className="border-primary/20 bg-primary/5 p-5">
                <CardTitle className="mb-3 font-serif text-[13px] font-bold text-primary">
                  ⚡ Live Activity
                </CardTitle>
                <div className="flex flex-col gap-2">
                  {liveEvents.map((e, i) => (
                    <p
                      key={i}
                      className="text-[12px] leading-tight text-muted-foreground"
                      style={{ opacity: 1 - i * 0.18 }}
                    >
                      {e}
                    </p>
                  ))}
                </div>
              </Card>
            )}

            {/* AI teaser */}
            <Card className="border-purple-500/20 p-5">
              <Badge
                variant="outline"
                className="mb-2.5 w-fit border-purple-500/30 text-purple-600 dark:text-purple-400"
              >
                ✦ AI Powered
              </Badge>
              <CardTitle className="mb-2 font-serif text-[14px] font-bold leading-tight text-foreground">
                AI summaries before you pay
              </CardTitle>
              <CardDescription className="text-[12px] leading-relaxed text-muted-foreground">
                Every article has a free AI-generated summary so you know what
                you are buying before paying.
              </CardDescription>
            </Card>

            {/* CTA */}
            <Card className="border-none bg-foreground p-5 text-background">
              <CardTitle className="mb-2 font-serif text-[15px] font-bold text-background">
                Start writing today
              </CardTitle>
              <CardDescription className="mb-4 text-[12px] leading-relaxed text-background/70">
                Earn XLM directly. No platform cuts. Withdraw anytime.
              </CardDescription>
              <Link href="/write">
                <Button variant="secondary" className="w-full">
                  Start Writing
                </Button>
              </Link>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
