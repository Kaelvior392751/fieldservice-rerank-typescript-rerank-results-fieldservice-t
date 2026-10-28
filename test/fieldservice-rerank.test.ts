import assert from "node:assert/strict";
import { InfraiReranker, rerankWorkOrders } from "../src/fieldservice-rerank.ts";

const input = {
  query: "compressor fault",
  topK: 2,
  workOrders: [
    { id: "WO-cold", summary: "Light panel replacement", photoNotes: [], dispatchStatus: "queued" as const },
    { id: "WO-hot", summary: "Compressor fault after restart", photoNotes: ["seal mark"], dispatchStatus: "assigned" as const, technicianFollowUp: "check seal" }
  ]
};

const fetcher: typeof fetch = async (_url, init) => {
  const body = JSON.parse(String(init?.body)) as { candidates: string[] };
  assert.equal(body.candidates[1]?.includes("Compressor fault"), true);
  return new Response(JSON.stringify({ ok: true, data: { results: [{ index: 1, score: 0.98 }, { index: 0, score: 0.12 }] }, metadata: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
};

const result = await rerankWorkOrders(input, new InfraiReranker("test-key", fetcher));
assert.deepEqual(result.map((order) => order.id), ["WO-hot", "WO-cold"]);
console.log("field-service decision test passed");
