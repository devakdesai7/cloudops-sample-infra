import sqlite3

conn = sqlite3.connect('/logs/shared-logs.db')
rows = conn.execute(
    "SELECT service, level, message, trace_id, meta FROM logs WHERE level='ERROR' ORDER BY id DESC LIMIT 15"
).fetchall()

for row in rows:
    print(row)