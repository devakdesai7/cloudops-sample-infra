# payment-service

**Owner:** Payments team (#payments-oncall) — this is our highest-incident
service, please read this one carefully before touching anything.

**Language:** Python / FastAPI
**Port:** 3002

## What it does
Wraps our (simulated) bank API integration. Charges the customer, or times
out and returns a clean error if the bank takes too long.

## Config
- `DOWNSTREAM_TIMEOUT_MS` — how long we wait for the bank API before giving
  up. **Currently 5000ms.** This has been tuned a few times based on real
  bank latency data — do not lower this without checking with payments team
  first, we've had incidents from this before.

## Known failure modes
- Bank API latency is naturally variable (roughly 200ms–3000ms under normal
  conditions). If `DOWNSTREAM_TIMEOUT_MS` gets set too close to or below
  that range, a large fraction of legitimate charges will start timing out
  even though nothing is actually "broken" — the bank is just slow, we're
  just not waiting long enough.
- Watch for a spike in `Charge failed: downstream bank API timeout` log
  lines with `duration_ms` clustering right around whatever the configured
  timeout is — that's the signature of a timeout misconfiguration, not an
  actual bank outage. A real bank outage usually shows failures immediately
  (near-0 duration_ms), not right at the timeout boundary.
- If duration_ms is spread out and roughly matches configured_timeout_ms
  consistently, it's very likely a config problem, not a real downstream
  issue.

## Escalation
#payments-oncall — please include the trace_id and duration_ms from the
error log when reaching out, saves a lot of back-and-forth.