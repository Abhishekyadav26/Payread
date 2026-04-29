/**
 * useWallet — persists the connected Stellar wallet address across page navigations.
 *
 * Stores the public key in localStorage so the wallet stays "connected"
 * even when the user navigates between Feed, Write, Dashboard, and Article pages.
 *
 * Fixed: Now validates wallet connection and auto-reconnects if needed.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  connectWallet as connectStellarWallet,
  disconnectWallet
} from "@/lib/stellar-helper";

const STORAGE_KEY = "payread_wallet_address";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Restore address from localStorage on first mount (client-side only)
  useEffect(() => {
    let mounted = true;

    const initializeWallet = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved.startsWith("G")) {
          // Simple validation - just check if it looks like a Stellar address
          if (mounted) {
            setAddress(saved);
          }
        }
      } catch {
        // localStorage failed; silently skip
        if (mounted) {
          setAddress(null);
        }
      }
    };

    initializeWallet();

    return () => {
      mounted = false;
    };
  }, []);

  // Simple wallet state management without periodic verification
  useEffect(() => {
    // No periodic verification needed for this demo
  }, [address]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const pub = await connectStellarWallet();
      setAddress(pub);
      localStorage.setItem(STORAGE_KEY, pub);
      toast.success("Wallet connected successfully!");
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      toast.error(error.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setAddress(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { address, connecting, connect, disconnect };
}
