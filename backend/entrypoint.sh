#!/bin/sh
set -e

echo "========================================================="
echo "Starting Indian Railways AI Block Planner Backend Service"
echo "========================================================="

# Ensure database tables and simulation seed data exist
python - << 'EOF'
import sys
from backend.app.core.database import SessionLocal, engine, Base
from sqlalchemy import inspect, text

print("Ensuring database schema exists...")
Base.metadata.create_all(bind=engine)
insp = inspect(engine)

count = 0
if insp.has_table('assets'):
    db = SessionLocal()
    try:
        count = db.execute(text("SELECT count(*) FROM assets")).scalar() or 0
    except Exception as e:
        print(f"Notice during count query: {e}")
        count = 0
    finally:
        db.close()

print(f"Current asset records count in database: {count}")
if count < 50:
    print("Database uninitialized or empty. Seeding master simulation data...")
    import data.seed_data
    data.seed_data.seed_database(reset=False)
    print("Master simulation data seeded successfully.")
else:
    print("Database already contains operational data. Skipping seed.")
EOF

echo "Launching FastAPI Uvicorn server on port 8000..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

