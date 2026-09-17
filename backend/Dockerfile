FROM python:3.11-slim

WORKDIR /app

# Install system runtime & compilation dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY . .

# Set environment
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Make entrypoint script executable
RUN chmod +x backend/entrypoint.sh

# Run database setup & start FastAPI server via entrypoint script
CMD ["/bin/sh", "backend/entrypoint.sh"]

