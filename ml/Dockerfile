FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ml/ ./ml/
COPY backend/optimization/ ./backend/optimization/
COPY backend/conflicts/ ./backend/conflicts/
COPY backend/coordination/ ./backend/coordination/

EXPOSE 8001

CMD ["uvicorn", "ml.service:app", "--host", "0.0.0.0", "--port", "8001"]
