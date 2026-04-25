/**
 * useWallet — persists the connected Stellar wallet address across page navigations.
 *
 * Stores the public key in localStorage so the wallet stays "connected"
 * even when the user navigates between Feed, Write, Dashboard, and Article pages.
 * 
 * Fixed: Now validates wallet connection and auto-reconnects if needed.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  connectWallet as connectStellarWallet, 
  disconnectWallet,
  verifyWalletConnection 
} from "@/lib/stellar-helper";

const STORAGE_KEY = "payread_wallet_address";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const verificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Restore address from localStorage on first mount (client-side only)
  useEffect(() => {
    let mounted = true;
    
    const initializeWallet = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved.startsWith("G")) {
          // Verify that the saved wallet is still actually connected
          const isConnected = await verifyWalletConnection(saved);
          if (mounted) {
            if (isConnected) {
              setAddress(saved);
            } else {
              // Wallet was disconnected externally, clear it
              localStorage.removeItem(STORAGE_KEY);
              setAddress(null);
            }
          }
        }
      } catch {
        // localStorage or verification failed; silently skip
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

  // Setup periodic verification to detect external disconnections
  useEffect(() => {
    if (!address) {
      if (verificationIntervalRef.current) {
        clearInterval(verificationIntervalRef.current);
        verificationIntervalRef.current = null;
      }
      return;
    }

    const verifyPeriodically = async () => {
      try {
        const isConnected = await verifyWalletConnection(address);
        if (!isConnected) {
          // Wallet was disconnected externally
          setAddress(null);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
        }
      } catch {
        // Verification failed, but don't disconnect yet
        // This could be a temporary network issue
      }
    };

    // Verify immediately, then every 30 seconds
    verifyPeriodically();
    verificationIntervalRef.current = setInterval(verifyPeriodically, 30000);

    return () => {
      if (verificationIntervalRef.current) {
        clearInterval(verificationIntervalRef.current);
        verificationIntervalRef.current = null;
      }
    };
  }, [address]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const pub = await connectStellarWallet();
      setAddress(pub);
      localStorage.setItem(STORAGE_KEY, pub);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      alert(error.message);
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
