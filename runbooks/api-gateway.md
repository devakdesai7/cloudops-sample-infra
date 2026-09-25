# api-gateway

**Owner:** Platform team (#platform-oncall)
**Language:** Node.js / Express
**Port:** 3000

## What it does
Public entry point for all checkout traffic. Mints the `trace_id` for every
incoming request (this is the *only* service that should generate a new
trace_id — everything downstream just passes it along). Forwards to
order-service and relays whatever comes back.

## Dependencies
- order-service (http://order-service:3001) — hard dependency, no fallback

## Known failure modes
- If order-service is slow/down, requests here will hang until the 10s axios
  timeout, then return a 502. Check order-service health first before
  assuming this service is the problem — api-gateway rarely fails on its own,
  it's almost always relaying an upstream issue.
- No retry logic here by design — retries happen (or don't) further down the
  chain. Don't add retries at this layer, we decided against it after an
  incident where retries here + retries in order-service caused a thundering
  herd on payment-service.

## Escalation
Low complexity service, most issues are actually upstream. If logs show
errors originating here specifically (not just relayed from a 502), ping
#platform-oncall.