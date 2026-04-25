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

  constructor(network: "testnet" | "mainnet" = "testnet") {
    this.networkPassphrase =
      network === "testnet"
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    this.walletNetwork =
      network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;
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
   * This is done by attempting to check if the wallet is available.
   */
  async verifyConnection(address: string): Promise<boolean> {
    try {
      this.ensureKit();
      // Try to get the current public key from the wallet
      // If this succeeds, the wallet is still connected
      const currentKey = await StellarWalletsKit.getPublicKey();
      
      // Check if the address matches the current connected wallet
      return currentKey === address;
    } catch {
      // If any error occurs, the wallet is not connected
      return false;
    }
  }

  disconnect(): void {
    this._publicKey = null;
    this.initialized = false;
    void StellarWalletsKit.disconnect();
  }
}

export const stellar = new StellarHelper("testnet");
export const connectWallet = () => stellar.connectWallet();
export const signTransaction = (xdr: string) => stellar.signTransaction(xdr);
export const disconnectWallet = () => stellar.disconnect();
export const verifyWalletConnection = (address: string) => stellar.verifyConnection(address);
