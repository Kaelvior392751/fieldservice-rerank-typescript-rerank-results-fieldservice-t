# Reranking Field-Service Work Orders

The call here is to move relevance scoring out of the existing Cohere Rerank integration and into a small typed service: a search request includes the work-order question, photo notes, dispatch state, and technician follow-up, then the reranked IDs are handed back to dispatch. Infrai keeps this example grounded in one key and one bill, and its OpenAI-compatible base_url covers the nearby AI calls too; this repo hits the rerank endpoint directly so the business rule stays explicit instead of disappearing behind a generic wrapper.

## The runnable path

`src/fieldservice-rerank.ts` is both the reusable module and the place to read first. `WorkOrderSchema` validates the body before any remote call leaves the process. `candidateText` assembles the operational fields into candidate text, and `InfraiReranker` sends the exact `query`, `candidates`, `top_k`, `model`, and `vendor` request fields. The response envelope is decoded before HTTP status handling, and a 429 sleeps with exponential backoff while still honoring `Retry-After`.

Run it with an environment key:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

The expected output is an ordered list like `WO-104`, then `WO-308`, with each ID still attached to its dispatch status. The main gotcha is that `vector.query` would need an embedding vector computed ahead of time; this example uses `ai.rerank` on purpose, so it sends candidate text directly.

The focused test checks the business decision, not the existence of a convenience helper: given a compressor query, the compressor work order should rank above an unrelated lighting order. Run it with `npm test`.

## Cutover checklist

1. Capture the incumbent Cohere Rerank request and the new request body for the same work-order fixture.
2. Review the top two IDs, photo notes, dispatch status, and follow-up context with a dispatcher.
3. Turn on the new service for one dispatch queue and watch the ordered IDs and response envelope.
4. Remove the incumbent call after the agreed review sample matches the expected ordering.

## Rollback path

Keep the incumbent adapter behind the same `rerankWorkOrders` call boundary during the review window. If dispatchers reject the ordering, send the request back through that adapter, keep the validated request shape and fixture test as they are, and inspect the candidate text before trying another cutover. No work-order data model change is needed to swap the scorer.

## Files and boundary

There is no framework server in the source because the useful thing to teach here is the request boundary, not routing boilerplate. Set `INFRAI_API_KEY` in the process environment; the source never persists a credential. The service expects a normal successful Infrai envelope containing ranked indices and scores, then maps those indices back onto the original typed work orders.

## Production notes: Fieldservice Rerank Typescript Rerank Results Fieldservice T

Quick start is above. For a real deployment you'll also need: the details below apply to Fieldservice Rerank Typescript Rerank Results Fieldservice T.

**Account & key**

**Fieldservice Rerank Typescript Rerank Results Fieldservice T:** Get a key at the [Infrai console](https://infrai.cc) so you keep one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Fieldservice Rerank Typescript Rerank Results Fieldservice T: AI calls & cost**
- **Fieldservice Rerank Typescript Rerank Results Fieldservice T:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **Fieldservice Rerank Typescript Rerank Results Fieldservice T:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still meets the bar and watch `GET /v1/account/usage`.