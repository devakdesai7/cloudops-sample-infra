const express = require("express");
const { randomUUID } = require("crypto");
const axios = require("axios");
const { initDb, logEvent } = require("./logger");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://order-service:3001";

app.post("/checkout", async (req, res) => {
  const traceId = randomUUID();
  const start = Date.now();

  logEvent("INFO", "Incoming checkout request", {
    traceId,
    items: req.body.items || [],
    amount: req.body.amount || 0,
  });

  try {
    const response = await axios.post(
      `${ORDER_SERVICE_URL}/checkout`,
      { ...req.body, trace_id: traceId },
      { timeout: 10000 }
    );

    const durationMs = Date.now() - start;
    logEvent("INFO", "Checkout request completed", {
      traceId,
      durationMs,
      upstreamStatus: response.status,
    });

    return res.json(response.data);
  } catch (err) {
    const durationMs = Date.now() - start;
    const upstreamStatus = err.response?.status || null;
    const upstreamBody = err.response?.data || null;

    logEvent("ERROR", "Checkout request failed", {
      traceId,
      durationMs,
      upstreamStatus,
      error: err.message,
    });

    return res.status(upstreamStatus || 502).json(
      upstreamBody || { status: "error", reason: "gateway_error", trace_id: traceId }
    );
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "api-gateway" }));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      logEvent("INFO", "api-gateway started", { port: PORT });
      console.log(`api-gateway listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init log DB", err);
    process.exit(1);
  });