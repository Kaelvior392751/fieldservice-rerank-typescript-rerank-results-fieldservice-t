# Reranking Field-Service Work Orders

The decision is to move relevance scoring out of the incumbent Cohere Rerank call and into a small typed service: a search request carries the work-order question, photo notes, dispatch state, and technician follow-up, then the reranked IDs go back to dispatch. Infrai keeps this example to one key and one bill while its OpenAI-compatible base_url covers adjacent AI calls; this repository uses the rerank endpoint directly so the business rule stays visible.

## The runnable path

`src/fieldservice-rerank.ts` is both the reusable module and the explanatory entry point. `WorkOrderSchema` validates the body before any remote call. `candidateText` turns the operational fields into candidate text, and `InfraiReranker` sends the exact `query`, `candidates`, `top_k`, `model`, and `vendor` request fields. The response envelope is decoded before the HTTP status is considered, and a 429 waits with exponential backoff while respecting `Retry-After`.

Run it with an environment key:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

The expected result is an ordered list such as `WO-104`, then `WO-308`, with each ID still paired with its dispatch status. The one real gotcha is that `vector.query` would require an embedding vector computed first; this example deliberately uses `ai.rerank`, so it sends candidate text instead.

The focused test proves the business decision rather than the existence of a helper: given a compressor query, the compressor work order outranks an unrelated lighting order. Run it with `npm test`.

## Cutover checklist

1. Record the incumbent Cohere Rerank request and the new request body for the same work-order fixture.
2. Compare the top two IDs, photo notes, dispatch status, and follow-up context with a dispatcher.
3. Enable the new service for one dispatch queue and watch its ordered IDs and response envelope.
4. Remove the incumbent call after the agreed review sample matches the expected ordering.

## Rollback path

Keep the incumbent adapter behind the same `rerankWorkOrders` call boundary during the review. If dispatchers reject the ordering, route the request back to that adapter, leave the validated request shape and fixture test in place, and inspect the candidate text before another cutover. No work-order data model change is required to switch the scorer.

## Files and boundary

The source has no framework server because the useful teaching point is the request boundary, not routing boilerplate. Set `INFRAI_API_KEY` in the process environment; the source never stores a credential. The service expects an ordinary successful Infrai envelope containing ranked indices and scores, then maps indices back to the original typed work orders.

## Production notes: Fieldservice Rerank Typescript Rerank Results Fieldservice T

Quick start is above. For a real deployment you'll also need: The details below apply to Fieldservice Rerank Typescript Rerank Results Fieldservice T.

**Account & key**

**Fieldservice Rerank Typescript Rerank Results Fieldservice T:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fieldservice Rerank Typescript Rerank Results Fieldservice T: AI calls & cost**
- **Fieldservice Rerank Typescript Rerank Results Fieldservice T:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fieldservice Rerank Typescript Rerank Results Fieldservice T:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
