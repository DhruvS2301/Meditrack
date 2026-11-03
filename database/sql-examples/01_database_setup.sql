-- ============================================================
-- 01_database_setup.sql
-- MediTrack: Database Initialization & Extension Configuration
-- ============================================================

-- NOTE: Execute this in pgAdmin 4 Query Tool while connected to the 'postgres' database
-- or execute directly in psql shell.

-- Step 1: Create Database
-- CREATE DATABASE meditrack
--   WITH
--   OWNER = postgres
--   ENCODING = 'UTF8'
--   LC_COLLATE = 'C'
--   LC_CTYPE = 'C'
--   TABLESPACE = pg_default
--   CONNECTION LIMIT = -1;

-- Connect to meditrack database before proceeding:
-- \c meditrack

-- Step 2: Install required PostgreSQL extensions
-- btree_gist allows GiST indexes on standard scalar types (BIGINT, TIMESTAMPTZ),
-- which is essential for appointment time-range exclusion constraints.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Step 3: Verify extension installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'btree_gist';

-- Step 4: Verify current database settings
SELECT current_database(), current_user, version();
