const express = require("express");
const { initDb, logEvent } = require("./logger");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;

// Fixed in-memory stock, just enough to look real
const STOCK = {
  "sku-1001": 42,
  "sku-1002": 17,
  "sku-1003": 250,
};

app.post("/reserve", async (req, res) => {
  const { order_id: orderId, trace_id: traceId, items = [] } = req.body;
  const start = Date.now();

  logEvent("INFO", "Reservation request received", {
    traceId,
    orderId,
    itemCount: items.length,
  });

  // Realistic but small, stable latency — this service is healthy and boring on purpose
  const latencyMs = 30 + Math.random() * 90;
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  const durationMs = Date.now() - start;

  logEvent("INFO", "Reservation succeeded", {
    traceId,
    orderId,
    durationMs,
  });

  return res.json({ status: "reserved", order_id: orderId, trace_id: traceId });
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "inventory-service" }));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      logEvent("INFO", "inventory-service started", { port: PORT });
      console.log(`inventory-service listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init log DB", err);
    process.exit(1);
  });