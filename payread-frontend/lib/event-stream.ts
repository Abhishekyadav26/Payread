// lib/event-stream.ts
import * as StellarSdk from "@stellar/stellar-sdk";
import { CONTRACTS, NETWORK, stroopsToXlm } from "./contract/config";

export type PayReadEvent =
  | { type: "Published"; articleId: number; price: string }
  | { type: "Read";      articleId: number; readCount: number }
  | { type: "Paid";      reader: string; articleId: number; amount: string }
  | { type: "Trending";  articleId: number; score: number };

export function startEventStream(
  onEvent: (e: PayReadEvent) => void,
  intervalMs = 5000
): () => void {
  let stopped    = false;
  let lastLedger = 0;

  async function poll() {
    if (stopped) return;
    try {
      const server = new StellarSdk.SorobanRpc.Server(NETWORK.SOROBAN_RPC);

      // On first run, start from current ledger
      if (!lastLedger) {
        lastLedger = (await server.getLatestLedger()).sequence - 1;
      }

      const events = await server.getEvents({
        startLedger: lastLedger,
        filters: [{
          type: "contract",
          contractIds: [
            CONTRACTS.CONTENT_REGISTRY,
            CONTRACTS.PAYMENT_VAULT,
            CONTRACTS.TRENDING,
          ],
        }],
        limit: 20,
      });

      type EventRecord = {
        ledger: number;
        topic: StellarSdk.xdr.ScVal[];
        value: StellarSdk.xdr.ScVal;
      };
      const eventRecords = ((events as unknown as { records?: EventRecord[]; events?: EventRecord[] }).records
        ?? (events as unknown as { events?: EventRecord[] }).events
        ?? []) as EventRecord[];

      for (const record of eventRecords) {
        // Advance the cursor so we never replay the same event
        if (record.ledger > lastLedger) lastLedger = record.ledger;

        const topic  = String(StellarSdk.scValToNative(record.topic[0]));
        const native = StellarSdk.scValToNative(record.value) as unknown[];

        switch (topic) {
          case "Published":
            onEvent({
              type:      "Published",
              articleId: Number(native[0]),
              price:     stroopsToXlm(BigInt(String(native[1]))),
            });
            break;

          case "Read":
            onEvent({
              type:      "Read",
              articleId: Number(native[0]),
              readCount: Number(native[1]),
            });
            break;

          case "Paid":
            onEvent({
              type:      "Paid",
              reader:    String(native[0]),
              articleId: Number(native[1]),
              amount:    stroopsToXlm(BigInt(String(native[2]))),
            });
            break;

          case "Trending":
            onEvent({
              type:      "Trending",
              articleId: Number(native[0]),
              score:     Number(native[1]),
            });
            break;
        }
      }
    } catch (e) {
      // Swallow errors silently — polling will retry
      console.warn("Event stream poll failed:", e);
    }

    if (!stopped) setTimeout(poll, intervalMs);
  }

  poll(); // kick off immediately
  return () => { stopped = true; }; // call this to stop (use as useEffect cleanup)
}