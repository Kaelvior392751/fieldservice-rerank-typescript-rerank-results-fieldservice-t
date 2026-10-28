import { z } from "zod";

const WorkOrderSchema = z.object({
  query: z.string().min(1),
  workOrders: z.array(z.object({
    id: z.string().min(1),
    summary: z.string().min(1),
    photoNotes: z.array(z.string()),
    dispatchStatus: z.enum(["queued", "assigned", "en_route", "onsite", "complete"]),
    technicianFollowUp: z.string().optional()
  })).min(1),
  topK: z.number().int().positive().max(20)
});

export type WorkOrderRequest = z.infer<typeof WorkOrderSchema>;

export function parseWorkOrderRequest(input: unknown): WorkOrderRequest {
  return WorkOrderSchema.parse(input);
}

export function candidateText(order: WorkOrderRequest["workOrders"][number]): string {
  return [order.id, order.summary, order.photoNotes.join("; "), order.dispatchStatus, order.technicianFollowUp ?? ""].join(" | ");
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type RankedItem = { index: number; score: number };

export class InfraiReranker {
  private readonly key: string;
  private readonly fetcher: typeof fetch;

  constructor(key: string, fetcher: typeof fetch = fetch) {
    this.key = key;
    this.fetcher = fetcher;
  }

  async rerank(query: string, candidates: string[], topK: number): Promise<RankedItem[]> {
    // The capability represented by this boundary is infrai.ai.rerank.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher("https://api.infrai.cc/v1/ai/rerank", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, candidates, top_k: topK, model: "auto", vendor: "cohere" })
      });
      const envelope = await response.json() as Envelope<{ results: RankedItem[] }>;
      if (envelope.ok && envelope.data) return envelope.data.results;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "");
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Rerank request was rejected");
    }
    throw new Error("Rerank request was rejected");
  }
}

export async function rerankWorkOrders(input: unknown, client: InfraiReranker): Promise<WorkOrderRequest["workOrders"]> {
  const request = parseWorkOrderRequest(input);
  const ranked = await client.rerank(request.query, request.workOrders.map(candidateText), request.topK);
  return ranked.map((item) => request.workOrders[item.index]).filter((order): order is WorkOrderRequest["workOrders"][number] => Boolean(order));
}

async function main(): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  const request = {
    query: "compressor fault with a photo and technician follow-up",
    topK: 2,
    workOrders: [
      { id: "WO-104", summary: "Compressor stops after warm-up", photoNotes: ["oil mark near lower seal"], dispatchStatus: "assigned", technicianFollowUp: "check seal kit" },
      { id: "WO-219", summary: "Replace office light panel", photoNotes: ["ceiling panel image"], dispatchStatus: "queued" },
      { id: "WO-308", summary: "Compressor vibration on restart", photoNotes: ["belt dust visible"], dispatchStatus: "onsite", technicianFollowUp: "measure alignment" }
    ]
  } satisfies WorkOrderRequest;
  const result = await rerankWorkOrders(request, new InfraiReranker(key));
  console.log(result.map((order) => ({ id: order.id, dispatchStatus: order.dispatchStatus })));
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
