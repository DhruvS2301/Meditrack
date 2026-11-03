#!/usr/bin/env bash
set -e

# ============================================================
# MediTrack: Automated Setup and Quickstart Script
# ============================================================

echo "============================================================"
echo "  MediTrack — Hospital Management & Patient Tracking System "
echo "============================================================"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# 1. Environment file check
if [ ! -f .env ]; then
  echo "--> Creating .env file from .env.example..."
  cp .env.example .env
fi

# Load DB env vars
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-meditrack}

echo ""
echo "--> 1. Installing npm packages for root, client, and server..."
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

echo ""
echo "--> 2. Setting up PostgreSQL Database (${DB_NAME})..."
if command -v createdb >/dev/null 2>&1; then
  createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || echo "    (Database '${DB_NAME}' already exists or created)"
elif command -v psql >/dev/null 2>&1; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || echo "    (Database '${DB_NAME}' already exists or created)"
fi

echo ""
echo "--> 3. Executing versioned SQL migrations..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/migrations/001_core_tables.sql
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/migrations/002_transactional_tables.sql
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/migrations/003_indexes_views_functions.sql

echo ""
echo "--> 4. Seeding realistic multi-month hospital data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/seeds/seed_data.sql

echo ""
echo "============================================================"
echo "  Setup Complete! Starting MediTrack Development Servers... "
echo "  Backend API:  http://localhost:5000                       "
echo "  Frontend Web: http://localhost:5173                       "
echo "============================================================"
echo ""

npm run dev
