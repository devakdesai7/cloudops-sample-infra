# inventory-service

**Owner:** Checkout team (#checkout-eng) — same team as order-service,
we don't have a dedicated owner for this one since it rarely needs attention.

**Language:** Node.js / Express
**Port:** 3003

## What it does
Reserves stock for an order. Currently backed by an in-memory stock map
(not a real DB yet — that's on the roadmap, low priority since this hasn't
caused issues).

## Known failure modes
Honestly, none documented — this service has been rock solid since launch.
Latency is consistently low (30-120ms) and predictable. If you're
investigating an incident and inventory-service logs look completely normal
(steady durations, no errors), it's very unlikely to be the cause — look
elsewhere first.

## Escalation
#checkout-eng, but this almost never comes up.  