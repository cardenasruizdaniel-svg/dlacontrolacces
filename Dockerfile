# Stage 1: Build Next.js Frontend Web UI
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Stage 2: Unified Production App (FastAPI + Embedded Next.js UI)
FROM python:3.11-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake libpq-dev libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY backend/pyproject.toml ./backend/
RUN pip install --no-cache-dir -e "./backend[dev]"

COPY backend ./backend
COPY --from=frontend-builder /app/frontend/out ./backend/app/static

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
