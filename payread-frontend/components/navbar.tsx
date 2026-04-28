"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function Navbar({
  address,
  onConnect,
  onDisconnect,
  children,
}: {
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  children?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Don't render wallet-dependent UI until mounted to prevent hydration mismatch
  const clientAddress = mounted ? address : null;
  const shortenAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      {/* Top accent bar */}
      <div className="h-[3px] w-full bg-primary" />

      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="no-underline">
            <span className="font-serif text-[22px] font-black tracking-tight text-foreground">
              Pay<span className="text-primary">Read</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {[
              { href: "/", label: "Feed" },
              { href: "/write", label: "Write" },
              { href: "/dashboard", label: "Dashboard" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {children}
          <AnimatedThemeToggler
            variant="star"
            className="rounded-md border bg-transparent p-2 hover:bg-muted"
          />

          <div className="flex items-center gap-3">
            {clientAddress ? (
              <>
                <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                  {shortenAddr(clientAddress)}
                </span>
                <button
                  onClick={onDisconnect}
                  className="rounded-md border bg-transparent px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={onConnect}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
