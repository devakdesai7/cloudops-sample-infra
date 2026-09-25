import sqlite3
import json
import os
import time
from datetime import datetime, timezone

DB_PATH = os.environ.get("LOG_DB_PATH", "/logs/shared-logs.db")
SERVICE_NAME = os.environ.get("SERVICE_NAME", "unknown-service")

def _get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            service TEXT NOT NULL,
            level TEXT NOT NULL,
            trace_id TEXT,
            message TEXT NOT NULL,
            meta TEXT
        )
    """)
    conn.commit()
    conn.close()

def log_event(level: str, message: str, trace_id: str = None, **meta):
    for attempt in range(3):
        try:
            conn = _get_conn()
            conn.execute(
                "INSERT INTO logs (timestamp, service, level, trace_id, message, meta) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    datetime.now(timezone.utc).isoformat(),
                    SERVICE_NAME,
                    level,
                    trace_id,
                    message,
                    json.dumps(meta) if meta else None,
                ),
            )
            conn.commit()
            conn.close()
            return
        except sqlite3.OperationalError:
            time.sleep(0.2 * (attempt + 1))
    # last resort: never let logging crash the request
    print(f"[log_event failed] {level} {message}")