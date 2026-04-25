"use client";
// app/dashboard/page.tsx — Author dashboard: earnings, articles, withdrawals

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import { getAllArticles, getAuthorBalance, buildWithdrawTx, signAndSubmit } from "@/lib/contracts";
import { useWallet } from "@/lib/use-wallet";
=======
import {
  getAllArticles,
  getAuthorBalance,
  buildWithdrawTx,
  signAndSubmit,
} from "@/lib/contracts";
import {
  connectWallet as connectStellarWallet,
  getWalletAddress,
} from "@/lib/stellar-helper";
>>>>>>> cf50cfa (wallet connection)
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
import { cn } from "@/lib/utils";

function shortenAddr(a: string) {
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

export default function DashboardPage() {
  const router = useRouter();
<<<<<<< HEAD
  const { address, connect: connectWallet, disconnect } = useWallet();
  const [articles, setArticles]   = useState<Article[]>([]);
  const [balance, setBalance]     = useState("0");
  const [loading, setLoading]     = useState(false);
=======
  const [address, setAddress] = useState<string | null>(() =>
    getWalletAddress(),
  );
  const [articles, setArticles] = useState<Article[]>([]);
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
>>>>>>> cf50cfa (wallet connection)
  const [withdrawing, setWithdrawing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [all, bal] = await Promise.all([
          getAllArticles(address),
          getAuthorBalance(address, address),
        ]);
        setArticles(all.filter((a) => a.author === address));
        setBalance(bal);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  async function handleWithdraw() {
    if (!address || parseFloat(balance) <= 0) return;
    setError(null);
    setWithdrawing(true);
    try {
      const xdr = await buildWithdrawTx(address);
      const hash = await signAndSubmit(xdr);
      setTxHash(hash);
      setBalance("0");
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      setError(error ?? "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  }

  const totalReads = articles.reduce((s, a) => s + a.read_count, 0);
  const totalEarnings = articles.reduce(
    (s, a) => s + parseFloat(a.price) * a.read_count,
    0,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        address={address}
        onConnect={connectWallet}
        onDisconnect={disconnect}
      >
        <Link href="/write">
          <Button variant="ghost" size="sm">
            + Write
          </Button>
        </Link>
      </Navbar>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px" }}>
        <div className="page-enter mb-9">
          <div className="mb-1 border-t-[3px] border-foreground pt-3.5">
            <h1 className="font-serif text-[34px] font-black tracking-tight text-foreground">
              Author Dashboard
            </h1>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Your earnings, reads, and published articles.
          </p>
        </div>

        {!address ? (
          <Card className="p-12 text-center">
            <CardHeader>
              <CardTitle className="font-serif text-[22px] font-bold text-foreground">
                Connect to see your dashboard
              </CardTitle>
              <CardDescription className="text-[13px] text-muted-foreground">
                Track earnings and manage your articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={connectWallet}>Connect Freighter</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats grid */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Articles", value: articles.length, suffix: "" },
                { label: "Total Reads", value: totalReads, suffix: "" },
                {
                  label: "Est. Earned",
                  value: totalEarnings.toFixed(2),
                  suffix: " XLM",
                },
                {
                  label: "Pending",
                  value: parseFloat(balance).toFixed(2),
                  suffix: " XLM",
                },
              ].map((s) => (
                <Card key={s.label} className="p-5 text-center">
                  <CardTitle className="font-serif text-[28px] font-black text-foreground">
                    {s.value}
                    {s.suffix}
                  </CardTitle>
                  <CardDescription className="mt-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {s.label}
                  </CardDescription>
                </Card>
              ))}
            </div>

            {/* Withdraw panel */}
            <Card
              className={cn(
                "mb-8 flex flex-col items-center justify-between gap-6 p-7 sm:flex-row",
                parseFloat(balance) > 0
                  ? "border-green-500/30 bg-green-500/5"
                  : "bg-muted/30",
              )}
            >
              <div className="flex-1">
                <p className="mb-1.5 text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Withdrawable Balance
                </p>
                <div
                  className={cn(
                    "font-serif text-[32px] font-black",
                    parseFloat(balance) > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground",
                  )}
                >
                  {balance} <span className="text-[16px] font-normal">XLM</span>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Held in on-chain vault. Withdraw anytime.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-[200px]">
                <Button
                  onClick={handleWithdraw}
                  disabled={withdrawing || parseFloat(balance) <= 0}
                  className="h-11 w-full"
                >
                  {withdrawing
                    ? "Signing in Freighter…"
                    : parseFloat(balance) > 0
                      ? `Withdraw ${balance} XLM`
                      : "Nothing to withdraw"}
                </Button>
                {error && (
                  <p className="text-center text-[12px] text-destructive sm:text-right">
                    {error}
                  </p>
                )}
                {txHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center font-mono text-[11px] text-green-600 dark:text-green-400 sm:text-right"
                  >
                    ✓ Withdrawn · View tx ↗
                  </a>
                )}
              </div>
            </Card>

            {/* Article table */}
            <div>
              <div
                style={{
                  borderTop: "2px solid var(--ink)",
                  paddingTop: 12,
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2
                  className="font-serif"
                  style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}
                >
                  Your Articles
                </h2>
                <a href="/write">
                  <button className="btn-ghost">+ New Article</button>
                </a>
              </div>

              {loading && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: 56, borderRadius: 4 }}
                    />
                  ))}
                </div>
              )}

              {!loading && articles.length === 0 && (
                <div
                  className="card"
                  style={{ padding: "36px 28px", textAlign: "center" }}
                >
                  <p
                    className="font-serif"
                    style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}
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
                    Start writing and earn XLM directly from readers
                  </p>
                  <a href="/write">
                    <button className="btn-primary">Write First Article</button>
                  </a>
                </div>
              )}

              {!loading && articles.length > 0 && (
                <div
                  style={{
                    border: "1px solid var(--rule)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  {/* Table header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 80px 100px 80px",
                      padding: "10px 20px",
                      background: "var(--paper)",
                      borderBottom: "1px solid var(--rule)",
                    }}
                  >
                    {["Title", "Price", "Reads", "Earned", ""].map((h) => (
                      <span
                        key={h}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--ink-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {articles.map((article, i) => (
                    <div
                      key={article.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 80px 80px 100px 80px",
                        padding: "14px 20px",
                        alignItems: "center",
                        borderBottom:
                          i < articles.length - 1
                            ? "1px solid var(--rule)"
                            : "none",
                        transition: "background 0.1s",
                      }}
                    >
                      <p
                        className="font-serif"
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--ink)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          paddingRight: 16,
                        }}
                      >
                        {article.title}
                      </p>
                      <span
                        className="font-mono"
                        style={{ fontSize: 12, color: "var(--ink-muted)" }}
                      >
                        {article.price} XLM
                      </span>
                      <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                        {article.read_count}
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 12,
                          color: "var(--green)",
                          fontWeight: 500,
                        }}
                      >
                        {(
                          parseFloat(article.price) * article.read_count
                        ).toFixed(3)}{" "}
                        XLM
                      </span>
                      <a href={`/article/${article.id}`}>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: 11, padding: "5px 10px" }}
                        >
                          View
                        </button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
