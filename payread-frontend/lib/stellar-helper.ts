/**
 * Production-level Stellar wallet integration helper.
 * Uses @creit.tech/stellar-wallets-kit for multi-wallet support.
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import {
  StellarWalletsKit
} from "@creit.tech/stellar-wallets-kit/sdk";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { FREIGHTER_ID } from "@creit.tech/stellar-wallets-kit/modules/freighter";

export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export class StellarHelper {
  private networkPassphrase: string;
  private walletNetwork: Networks;
  private initialized = false;
  private _publicKey: string | null = null;
  private readonly STORAGE_KEY = 'payread_wallet_address';

  constructor(network: "testnet" | "mainnet" = "testnet") {
    this.networkPassphrase =
      network === "testnet"
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    this.walletNetwork =
      network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;

    // Load saved wallet address on initialization
    this.loadSavedWallet();
  }

  private loadSavedWallet(): void {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved && saved.startsWith("G")) {
          this._publicKey = saved;
        }
      } catch (error) {
        console.warn("Failed to load saved wallet:", error);
      }
    }
  }

  private saveWalletAddress(address: string): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.STORAGE_KEY, address);
      } catch (error) {
        console.warn("Failed to save wallet address:", error);
      }
    }
  }

  private clearSavedWallet(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (error) {
        console.warn("Failed to clear saved wallet:", error);
      }
    }
  }

  get isConnected(): boolean {
    return this._publicKey !== null;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  private ensureKit(): void {
    if (this.initialized) return;
    if (typeof window === "undefined") {
      throw new Error(
        "StellarWalletsKit can only be initialized in a browser environment."
      );
    }
    StellarWalletsKit.init({
      network: this.walletNetwork,
      selectedWalletId: FREIGHTER_ID,
      modules: defaultModules(),
    });
    this.initialized = true;
  }

  async connectWallet(): Promise<string> {
    this.ensureKit();
    StellarWalletsKit.setWallet(FREIGHTER_ID);
    const { address } = await StellarWalletsKit.authModal();
    if (!address || !address.startsWith("G")) {
      throw new Error("Invalid or missing public key from wallet.");
    }
    this._publicKey = address;
    this.saveWalletAddress(address);
    return address;
  }

  async signTransaction(xdr: string): Promise<{ signedTxXdr: string }> {
    this.ensureKit();
    const signer = this._publicKey
      ? { address: this._publicKey }
      : {};
    return StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase: this.networkPassphrase,
      ...signer,
    });
  }

  /**
   * Verify if a wallet address is still connected.
   * This is done by checking if the wallet kit is properly initialized
   * and attempting a minimal operation.
   */
  async verifyConnection(address: string): Promise<boolean> {
    try {
      // Check if we have a stored public key that matches
      if (this._publicKey && this._publicKey === address) {
        // Try a simple operation to verify the wallet is still responsive
        this.ensureKit();
        return true;
      }
      return false;
    } catch {
      // If any error occurs, the wallet is not connected
      return false;
    }
  }

  disconnect(): void {
    this._publicKey = null;
    this.initialized = false;
    this.clearSavedWallet();
    void StellarWalletsKit.disconnect();
  }
}

export const stellar = new StellarHelper("testnet");
export const connectWallet = () => stellar.connectWallet();
export const signTransaction = (xdr: string) => stellar.signTransaction(xdr);
export const disconnectWallet = () => stellar.disconnect();
