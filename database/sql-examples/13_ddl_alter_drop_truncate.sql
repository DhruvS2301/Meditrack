-- ============================================================
-- 13_ddl_alter_drop_truncate.sql
-- MediTrack: DDL Operations (CREATE, ALTER, TRUNCATE, DROP)
-- ============================================================

-- NOTE: All destructive DDL operations in this demonstration file
-- are performed strictly against an isolated disposable demonstration table
-- (demo_equipment_inventory) to safeguard production hospital data.

-- 1. CREATE TABLE: Demonstration Asset Tracking Table
CREATE TABLE IF NOT EXISTS demo_equipment_inventory (
  equipment_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  equipment_name VARCHAR(100) NOT NULL,
  serial_number  VARCHAR(50) UNIQUE,
  purchase_date  DATE,
  maintenance_cost NUMERIC(10,2) DEFAULT 0.00
);

-- 2. ALTER TABLE: ADD COLUMN
-- Add a department allocation reference
ALTER TABLE demo_equipment_inventory
  ADD COLUMN department_id BIGINT REFERENCES departments(department_id) ON DELETE SET NULL;

-- 3. ALTER TABLE: MODIFY COLUMN DATA TYPE / CONSTRAINT
-- Alter maintenance_cost to allow higher precision and add check constraint
ALTER TABLE demo_equipment_inventory
  ALTER COLUMN maintenance_cost TYPE NUMERIC(12,2);

ALTER TABLE demo_equipment_inventory
  ADD CONSTRAINT chk_demo_maintenance_nonneg
  CHECK (maintenance_cost >= 0);

-- Insert dummy rows to demonstrate TRUNCATE
INSERT INTO demo_equipment_inventory (equipment_name, serial_number, maintenance_cost)
VALUES 
  ('Defibrillator A1', 'SN-DEF-001', 1200.00),
  ('Ultrasound Probe', 'SN-ULT-002', 450.00);

-- Verify records exist:
SELECT * FROM demo_equipment_inventory;

-- 4. TRUNCATE TABLE: Instantly wipe all rows while preserving table schema
TRUNCATE TABLE demo_equipment_inventory;

-- Verify table is now empty:
SELECT COUNT(*) AS row_count_after_truncate FROM demo_equipment_inventory;

-- 5. DROP TABLE: Safely remove the demonstration table
DROP TABLE IF EXISTS demo_equipment_inventory CASCADE;

-- Verify table no longer exists in PostgreSQL catalog:
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'demo_equipment_inventory'
) AS table_still_exists;
