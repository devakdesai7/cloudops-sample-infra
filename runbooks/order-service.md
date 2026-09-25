# order-service

**Owner:** Checkout team (#checkout-eng)
**Language:** Node.js / Express
**Port:** 3001

## What it does
Core checkout orchestration. Calls payment-service and inventory-service
*in parallel* (Promise.allSettled) so a slow payment call doesn't block
the inventory check. Returns success only if both succeed.

## Dependencies
- payment-service (http://payment-service:3002)
- inventory-service (http://inventory-service:3003)

## Known failure modes
- `failureReason: "payment_failed"` in logs means payment-service errored
  or timed out — this is currently our most common failure mode, see
  payment-service's runbook.
- `failureReason: "inventory_failed"` means inventory-service errored —
  rare, inventory-service has been stable for months.
- If you see BOTH payment and inventory errors on the same trace_id at the
  same time, that's usually a shared infra issue (DB, network), not a
  logic bug in either individual service — check the log volume/DB first.

## Notes
We deliberately made the timeout here (8000ms) longer than payment-service's
internal timeout (currently 5000ms) so that payment-service always fails on
its own terms with a clean error, instead of us timing out first and getting
a generic "socket hang up" that doesn't tell us anything useful. If you ever
change payment-service's timeout, make sure it stays below ours.

## Escalation
#checkout-eng for anything checkout-logic related. If it's clearly a
downstream service failing, go straight to that service's owner instead.