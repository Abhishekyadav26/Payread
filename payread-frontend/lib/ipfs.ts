// lib/ipfs.ts — IPFS upload and fetch utilities
// Uses Web3.Storage or Pinata for production, localStorage for demo

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";
const DEMO_MODE = true; // Set to false when using real IPFS service

/**
 * Upload content to IPFS
 * Returns the IPFS CID (Content Identifier) hash
 */
export async function uploadToIPFS(content: string): Promise<string> {
  if (DEMO_MODE) {
    // Demo mode: Store in localStorage with hash as key
    const hash = await generateContentHash(content);
    localStorage.setItem(`ipfs:${hash}`, content);
    console.log("[DEMO IPFS] Content stored with hash:", hash);
    return hash;
  }

  // Production: Use Web3.Storage or Pinata
  // const response = await fetch('https://api.web3.storage/upload', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN}` },
  //   body: new Blob([content], { type: 'text/plain' }),
  // });
  // const { cid } = await response.json();
  // return cid;

  throw new Error("Production IPFS not configured. Set DEMO_MODE=true for testing.");
}

/**
 * Fetch content from IPFS using CID
 */
export async function fetchFromIPFS(cid: string): Promise<string> {
  if (DEMO_MODE) {
    // Demo mode: Fetch from localStorage
    const content = localStorage.getItem(`ipfs:${cid}`);
    if (content) {
      console.log("[DEMO IPFS] Content retrieved from localStorage:", cid);
      return content;
    }
    console.warn("[DEMO IPFS] Content not found in localStorage:", cid);
    return "Content not available. This article was published before IPFS integration was enabled.";
  }

  // Production: Fetch from IPFS gateway
  try {
    const response = await fetch(`${IPFS_GATEWAY}${cid}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error("Failed to fetch from IPFS:", error);
    throw new Error("Failed to fetch article content from IPFS");
  }
}

/**
 * Generate a simple hash for the content
 */
async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if content exists in IPFS/localStorage
 */
export function checkIPFSContent(cid: string): boolean {
  if (DEMO_MODE) {
    return localStorage.getItem(`ipfs:${cid}`) !== null;
  }
  return true;
}
