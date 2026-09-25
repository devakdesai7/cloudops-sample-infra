const sqlite3 = require("sqlite3").verbose();

const DB_PATH = process.env.LOG_DB_PATH || "/logs/shared-logs.db";
const SERVICE_NAME = process.env.SERVICE_NAME || "unknown-service";

let db = null;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
    db.run("PRAGMA journal_mode = WAL;");
    db.run("PRAGMA busy_timeout = 5000;");
  }
  return db;
}

function initDb() {
  return new Promise((resolve, reject) => {
    getDb().run(
      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        service TEXT NOT NULL,
        level TEXT NOT NULL,
        trace_id TEXT,
        message TEXT NOT NULL,
        meta TEXT
      )`,
      (err) => (err ? reject(err) : resolve())
    );
  });
}

function logEvent(level, message, { traceId = null, ...meta } = {}) {
  const timestamp = new Date().toISOString();
  const metaJson = Object.keys(meta).length ? JSON.stringify(meta) : null;

  getDb().run(
    `INSERT INTO logs (timestamp, service, level, trace_id, message, meta) VALUES (?, ?, ?, ?, ?, ?)`,
    [timestamp, SERVICE_NAME, level, traceId, message, metaJson],
    (err) => {
      if (err) {
        console.error("[log_event failed]", level, message, err.message);
      }
    }
  );
}

module.exports = { initDb, logEvent };