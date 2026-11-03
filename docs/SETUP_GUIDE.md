# MediTrack — Installation & Setup Guide

This guide provides step-by-step instructions to set up, configure, migrate, seed, and run MediTrack on a development computer.

---

## Prerequisites
- **Node.js**: Version 18.0 or higher (`node -v`)
- **npm**: Version 9.0 or higher (`npm -v`)
- **PostgreSQL**: Version 14 or higher (`psql --version`)
- **pgAdmin 4**: (Optional, recommended for live viva inspection)

---

## Step 1: Clone or Navigate to Project
```bash
cd /Users/dhruvkun/meditrack
```

---

## Step 2: Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Open `.env` and verify your PostgreSQL credentials:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=meditrack
DB_USER=postgres
DB_PASSWORD=your_postgres_password
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## Step 3: Create the PostgreSQL Database
Open a terminal and run `psql` (or use pgAdmin 4):
```bash
# Connect to PostgreSQL server
psql -U postgres

# Create the database
CREATE DATABASE meditrack;

# Exit psql
\q
```

---

## Step 4: Run Migrations and Seed Dataset
Run the versioned SQL migrations in order against the `meditrack` database:

```bash
# 1. Core tables (departments, patients, doctors, beds)
psql -U postgres -d meditrack -f database/migrations/001_core_tables.sql

# 2. Transactional tables (appointments, admissions, prescriptions, bills, payments, audit)
psql -U postgres -d meditrack -f database/migrations/002_transactional_tables.sql

# 3. Constraints, Indexes, Views, Functions, and Triggers
psql -U postgres -d meditrack -f database/migrations/003_indexes_views_functions.sql

# 4. Populate realistic multi-month demonstration data
psql -U postgres -d meditrack -f database/seeds/seed_data.sql
```

*(Alternatively, open pgAdmin 4, connect to the `meditrack` database, open the Query Tool, and execute each file sequentially).*

---

## Step 5: Install Dependencies
Run from the root directory:
```bash
# Install root, client, and server dependencies
npm run install:all
```

---

## Step 6: Start Development Servers
Run both backend Express server and frontend Vite server concurrently:
```bash
npm run dev
```

Or run them in separate terminal windows:
```bash
# Terminal 1: Backend API (runs on port 5000)
npm run dev:server

# Terminal 2: Frontend Web App (runs on port 5173)
npm run dev:client
```

---

## Step 7: Verify Installation
1. Open your browser to `http://localhost:5173` to view the MediTrack Clinical Operations dashboard.
2. Verify API connectivity: `http://localhost:5000/api/health` should return:
   ```json
   {
     "success": true,
     "status": "healthy",
     "database": "connected",
     "db_version": "PostgreSQL 18.x"
   }
   ```
