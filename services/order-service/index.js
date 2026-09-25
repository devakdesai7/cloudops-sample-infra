const express = require("express");
const { randomUUID } = require("crypto");
const axios = require("axios");
const { initDb, logEvent } = require("./logger");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://payment-service:3002";
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || "http://inventory-service:3003";

app.post("/checkout", async (req, res) => {
  const traceId = req.body.trace_id || randomUUID();
  const orderId = randomUUID();
  const start = Date.now();

  logEvent("INFO", "Checkout request received", {
    traceId,
    orderId,
    items: req.body.items || [],
  });

  try {
    const [inventoryResult, paymentResult] = await Promise.allSettled([
      axios.post(
        `${INVENTORY_SERVICE_URL}/reserve`,
        { order_id: orderId, trace_id: traceId, items: req.body.items || [] },
        { timeout: 8000 }
      ),
      axios.post(
        `${PAYMENT_SERVICE_URL}/charge`,
        { order_id: orderId, trace_id: traceId, amount: req.body.amount || 0 },
        { timeout: 8000 }
      ),
    ]);

    const inventoryOk = inventoryResult.status === "fulfilled";
    const paymentOk = paymentResult.status === "fulfilled";
    const durationMs = Date.now() - start;

    if (inventoryOk && paymentOk) {
      logEvent("INFO", "Checkout succeeded", { traceId, orderId, durationMs });
      return res.json({ status: "success", order_id: orderId, trace_id: traceId });
    }

    const failureReason = !paymentOk
      ? "payment_failed"
      : "inventory_failed";

    logEvent("ERROR", "Checkout failed", {
      traceId,
      orderId,
      durationMs,
      failureReason,
      paymentError: !paymentOk ? String(paymentResult.reason?.message || paymentResult.reason) : null,
      inventoryError: !inventoryOk ? String(inventoryResult.reason?.message || inventoryResult.reason) : null,
    });

    return res.status(502).json({
      status: "error",
      reason: failureReason,
      trace_id: traceId,
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    logEvent("ERROR", "Checkout failed: unexpected error", {
      traceId,
      orderId,
      durationMs,
      error: err.message,
    });
    return res.status(500).json({ status: "error", reason: "internal_error", trace_id: traceId });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "order-service" }));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      logEvent("INFO", "order-service started", { port: PORT });
      console.log(`order-service listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init log DB", err);
    process.exit(1);
  });