-- ============================================================
-- 02_create_tables.sql
-- MediTrack: Relational Table Definitions (DDL)
-- ============================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  department_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  location        VARCHAR(100),
  contact_number  VARCHAR(20),
  head_doctor_id  BIGINT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  patient_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_code            VARCHAR(20) NOT NULL UNIQUE,
  full_name               VARCHAR(100) NOT NULL,
  date_of_birth           DATE,
  gender                  VARCHAR(30),
  phone                   VARCHAR(20) NOT NULL,
  email                   VARCHAR(150),
  address                 TEXT,
  emergency_contact_name  VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  blood_group             VARCHAR(5),
  is_active               BOOLEAN NOT NULL DEFAULT true,
  registered_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ
);

-- 3. Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
  doctor_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_code      VARCHAR(20) NOT NULL UNIQUE,
  full_name        VARCHAR(100) NOT NULL,
  email            VARCHAR(150),
  phone            VARCHAR(20) NOT NULL,
  department_id    BIGINT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  specialisation   VARCHAR(100) NOT NULL,
  qualification    VARCHAR(200),
  experience_years INTEGER,
  consultation_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- Add Foreign Key for Department Head Doctor
ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head_doctor
  FOREIGN KEY (head_doctor_id)
  REFERENCES doctors(doctor_id)
  ON DELETE SET NULL;

-- 4. Beds Table
CREATE TABLE IF NOT EXISTS beds (
  bed_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bed_number    VARCHAR(20) NOT NULL,
  ward_name     VARCHAR(100) NOT NULL,
  department_id BIGINT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  bed_type      VARCHAR(20) NOT NULL DEFAULT 'General',
  daily_charge  NUMERIC(12,2) NOT NULL DEFAULT 0,
  bed_status    VARCHAR(20) NOT NULL DEFAULT 'Available',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_code  VARCHAR(20) NOT NULL UNIQUE,
  patient_id        BIGINT NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
  doctor_id         BIGINT NOT NULL REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
  department_id     BIGINT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  appointment_start TIMESTAMPTZ NOT NULL,
  appointment_end   TIMESTAMPTZ NOT NULL,
  reason            TEXT,
  notes             TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- 6. Inpatient Admissions Table
CREATE TABLE IF NOT EXISTS admissions (
  admission_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admission_code          VARCHAR(20) NOT NULL UNIQUE,
  patient_id              BIGINT NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
  doctor_id               BIGINT NOT NULL REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
  department_id           BIGINT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  bed_id                  BIGINT NOT NULL REFERENCES beds(bed_id) ON DELETE RESTRICT,
  admission_datetime      TIMESTAMPTZ NOT NULL,
  discharge_datetime      TIMESTAMPTZ,
  admission_reason        TEXT NOT NULL,
  initial_notes           TEXT,
  discharge_notes         TEXT,
  expected_discharge_date DATE,
  status                  VARCHAR(20) NOT NULL DEFAULT 'Active',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ
);

-- 7. Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
  prescription_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prescription_code VARCHAR(20) NOT NULL UNIQUE,
  patient_id        BIGINT NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
  doctor_id         BIGINT NOT NULL REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
  appointment_id    BIGINT REFERENCES appointments(appointment_id) ON DELETE SET NULL,
  prescription_date DATE NOT NULL,
  notes             TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'Draft',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- 8. Prescription Items Table (1-to-many relationship)
CREATE TABLE IF NOT EXISTS prescription_items (
  prescription_item_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prescription_id         BIGINT NOT NULL REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
  medicine_name           VARCHAR(200) NOT NULL,
  dosage_instructions     TEXT NOT NULL,
  route                   VARCHAR(100),
  frequency               VARCHAR(100) NOT NULL,
  duration                VARCHAR(100) NOT NULL,
  quantity                INTEGER NOT NULL,
  additional_instructions TEXT
);

-- 9. Bills Table
CREATE TABLE IF NOT EXISTS bills (
  bill_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_number     VARCHAR(20) NOT NULL UNIQUE,
  patient_id      BIGINT NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
  appointment_id  BIGINT REFERENCES appointments(appointment_id) ON DELETE SET NULL,
  admission_id    BIGINT REFERENCES admissions(admission_id) ON DELETE SET NULL,
  bill_date       DATE NOT NULL,
  due_date        DATE,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'Pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- 10. Bill Line Items Table (1-to-many relationship)
CREATE TABLE IF NOT EXISTS bill_items (
  bill_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id      BIGINT NOT NULL REFERENCES bills(bill_id) ON DELETE CASCADE,
  description  VARCHAR(300) NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12,2) NOT NULL,
  line_total   NUMERIC(12,2) NOT NULL
);

-- 11. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  payment_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id               BIGINT NOT NULL REFERENCES bills(bill_id) ON DELETE RESTRICT,
  amount                NUMERIC(12,2) NOT NULL,
  payment_method        VARCHAR(20) NOT NULL,
  payment_status        VARCHAR(20) NOT NULL DEFAULT 'Completed',
  transaction_reference VARCHAR(100),
  payment_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Audit Logs Table (Polymorphic entity_id tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   BIGINT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
