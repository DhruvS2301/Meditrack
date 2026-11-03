-- ============================================================
-- MediTrack Database Migration 001
-- Create core tables: departments, patients, doctors, beds
-- ============================================================

-- Ensure btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  department_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  location        VARCHAR(100),
  contact_number  VARCHAR(20),
  head_doctor_id  BIGINT,        -- FK added after doctors table
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PATIENTS
-- ============================================================
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
  updated_at              TIMESTAMPTZ,

  CONSTRAINT chk_gender CHECK (
    gender IS NULL OR gender IN ('Male','Female','Other','Prefer not to say')
  ),
  CONSTRAINT chk_blood_group CHECK (
    blood_group IS NULL OR blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')
  ),
  CONSTRAINT chk_dob_not_future CHECK (
    date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE
  )
);

-- Auto-generate patient_code
CREATE SEQUENCE IF NOT EXISTS patient_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_patient_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.patient_code := 'PAT-' || LPAD(nextval('patient_code_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patient_code
  BEFORE INSERT ON patients
  FOR EACH ROW
  WHEN (NEW.patient_code IS NULL OR NEW.patient_code = '')
  EXECUTE FUNCTION generate_patient_code();

-- ============================================================
-- DOCTORS
-- ============================================================
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
  updated_at       TIMESTAMPTZ,

  CONSTRAINT chk_experience CHECK (experience_years IS NULL OR experience_years >= 0),
  CONSTRAINT chk_consultation_fee CHECK (consultation_fee >= 0)
);

-- Auto-generate doctor_code
CREATE SEQUENCE IF NOT EXISTS doctor_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_doctor_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.doctor_code := 'DOC-' || LPAD(nextval('doctor_code_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doctor_code
  BEFORE INSERT ON doctors
  FOR EACH ROW
  WHEN (NEW.doctor_code IS NULL OR NEW.doctor_code = '')
  EXECUTE FUNCTION generate_doctor_code();

-- Now add FK from departments to doctors for head_doctor_id
ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head_doctor
  FOREIGN KEY (head_doctor_id)
  REFERENCES doctors(doctor_id)
  ON DELETE SET NULL;

-- ============================================================
-- BEDS
-- ============================================================
CREATE TABLE IF NOT EXISTS beds (
  bed_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bed_number   VARCHAR(20) NOT NULL,
  ward_name    VARCHAR(100) NOT NULL,
  department_id BIGINT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  bed_type     VARCHAR(20) NOT NULL DEFAULT 'General',
  daily_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  bed_status   VARCHAR(20) NOT NULL DEFAULT 'Available',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_bed_type CHECK (bed_type IN ('General','Semi-Private','Private','ICU')),
  CONSTRAINT chk_bed_status CHECK (bed_status IN ('Available','Occupied','Maintenance')),
  CONSTRAINT chk_daily_charge CHECK (daily_charge >= 0),
  CONSTRAINT uq_bed_ward UNIQUE (bed_number, ward_name)
);
