-- ============================================================
-- MediTrack Database Migration 002
-- Appointments, Admissions, Prescriptions, Bills, Payments, Audit
-- ============================================================

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_code VARCHAR(20) NOT NULL UNIQUE,
  patient_id       BIGINT NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
  doctor_id        BIGINT NOT NULL REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
  department_id    BIGINT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  appointment_start TIMESTAMPTZ NOT NULL,
  appointment_end   TIMESTAMPTZ NOT NULL,
  reason           TEXT,
  notes            TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ,

  CONSTRAINT chk_appt_status CHECK (
    status IN ('Scheduled','Confirmed','Checked In','In Progress','Completed','Cancelled','No Show')
  ),
  CONSTRAINT chk_appt_times CHECK (appointment_end > appointment_start)
);

-- Auto-generate appointment_code
CREATE SEQUENCE IF NOT EXISTS appointment_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_appointment_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.appointment_code := 'APT-' || LPAD(nextval('appointment_code_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_code
  BEFORE INSERT ON appointments
  FOR EACH ROW
  WHEN (NEW.appointment_code IS NULL OR NEW.appointment_code = '')
  EXECUTE FUNCTION generate_appointment_code();

-- Prevent doctor double-booking via exclusion constraint
-- (requires btree_gist extension)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appt_doctor_overlap
  ON appointments USING GIST (
    doctor_id,
    tstzrange(appointment_start, appointment_end, '[)')
  )
  WHERE status NOT IN ('Cancelled', 'No Show');

CREATE UNIQUE INDEX IF NOT EXISTS idx_appt_patient_overlap
  ON appointments USING GIST (
    patient_id,
    tstzrange(appointment_start, appointment_end, '[)')
  )
  WHERE status NOT IN ('Cancelled', 'No Show');

-- Audit trigger for appointments
CREATE OR REPLACE FUNCTION trg_audit_appointment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
    VALUES ('appointment', NEW.appointment_id, 'INSERT', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
    VALUES ('appointment', NEW.appointment_id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ADMISSIONS
-- ============================================================
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
  updated_at              TIMESTAMPTZ,

  CONSTRAINT chk_admission_status CHECK (status IN ('Active','Discharged','Transferred')),
  CONSTRAINT chk_discharge_after_admission CHECK (
    discharge_datetime IS NULL OR discharge_datetime > admission_datetime
  )
);

-- Auto-generate admission_code
CREATE SEQUENCE IF NOT EXISTS admission_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_admission_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.admission_code := 'ADM-' || LPAD(nextval('admission_code_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admission_code
  BEFORE INSERT ON admissions
  FOR EACH ROW
  WHEN (NEW.admission_code IS NULL OR NEW.admission_code = '')
  EXECUTE FUNCTION generate_admission_code();

-- Prevent a bed from being assigned to two simultaneous active admissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_admission_per_bed
  ON admissions (bed_id)
  WHERE status = 'Active';

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
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
  updated_at        TIMESTAMPTZ,

  CONSTRAINT chk_prescription_status CHECK (status IN ('Draft','Finalised'))
);

CREATE SEQUENCE IF NOT EXISTS prescription_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_prescription_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.prescription_code := 'RX-' || LPAD(nextval('prescription_code_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prescription_code
  BEFORE INSERT ON prescriptions
  FOR EACH ROW
  WHEN (NEW.prescription_code IS NULL OR NEW.prescription_code = '')
  EXECUTE FUNCTION generate_prescription_code();

-- ============================================================
-- PRESCRIPTION ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_items (
  prescription_item_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prescription_id         BIGINT NOT NULL REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
  medicine_name           VARCHAR(200) NOT NULL,
  dosage_instructions     TEXT NOT NULL,
  route                   VARCHAR(100),
  frequency               VARCHAR(100) NOT NULL,
  duration                VARCHAR(100) NOT NULL,
  quantity                INTEGER NOT NULL,
  additional_instructions TEXT,

  CONSTRAINT chk_quantity_positive CHECK (quantity > 0)
);

-- ============================================================
-- BILLS
-- ============================================================
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
  updated_at      TIMESTAMPTZ,

  CONSTRAINT chk_bill_status CHECK (
    status IN ('Pending','Partial','Paid','Overdue','Cancelled')
  ),
  CONSTRAINT chk_bill_amounts CHECK (
    subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0
  ),
  CONSTRAINT chk_discount_lte_subtotal CHECK (discount_amount <= subtotal)
);

-- Auto-generate bill_number
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.bill_number := 'BILL-' || LPAD(nextval('bill_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bill_number
  BEFORE INSERT ON bills
  FOR EACH ROW
  WHEN (NEW.bill_number IS NULL OR NEW.bill_number = '')
  EXECUTE FUNCTION generate_bill_number();

-- ============================================================
-- BILL ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_items (
  bill_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id      BIGINT NOT NULL REFERENCES bills(bill_id) ON DELETE CASCADE,
  description  VARCHAR(300) NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12,2) NOT NULL,
  line_total   NUMERIC(12,2) NOT NULL,

  CONSTRAINT chk_bill_item_qty CHECK (quantity > 0),
  CONSTRAINT chk_bill_item_price CHECK (unit_price >= 0),
  CONSTRAINT chk_bill_item_total CHECK (line_total >= 0)
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  payment_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id               BIGINT NOT NULL REFERENCES bills(bill_id) ON DELETE RESTRICT,
  amount                NUMERIC(12,2) NOT NULL,
  payment_method        VARCHAR(20) NOT NULL,
  payment_status        VARCHAR(20) NOT NULL DEFAULT 'Completed',
  transaction_reference VARCHAR(100),
  payment_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_payment_method CHECK (
    payment_method IN ('Cash','Card','UPI','Bank Transfer')
  ),
  CONSTRAINT chk_payment_status CHECK (
    payment_status IN ('Pending','Completed','Failed','Refunded')
  ),
  CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    BIGINT NOT NULL,
  action_type  VARCHAR(50) NOT NULL,
  old_values   JSONB,
  new_values   JSONB,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: entity_id is a polymorphic identifier — it references different tables
-- based on entity_type. This is intentional for a flexible audit log.
-- Do NOT add a foreign key constraint on entity_id.
