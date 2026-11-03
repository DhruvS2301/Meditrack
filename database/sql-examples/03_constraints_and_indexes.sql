-- ============================================================
-- 03_constraints_and_indexes.sql
-- MediTrack: Integrity Constraints, Check Rules, and Indexing
-- ============================================================

-- 1. Check Constraints on Patients
ALTER TABLE patients
  ADD CONSTRAINT chk_patient_gender
  CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other', 'Prefer not to say'));

ALTER TABLE patients
  ADD CONSTRAINT chk_patient_blood_group
  CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

ALTER TABLE patients
  ADD CONSTRAINT chk_patient_dob_not_future
  CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE);

-- 2. Check Constraints on Doctors
ALTER TABLE doctors
  ADD CONSTRAINT chk_doctor_experience
  CHECK (experience_years IS NULL OR experience_years >= 0);

ALTER TABLE doctors
  ADD CONSTRAINT chk_doctor_consultation_fee
  CHECK (consultation_fee >= 0);

-- 3. Check Constraints on Beds
ALTER TABLE beds
  ADD CONSTRAINT chk_bed_type
  CHECK (bed_type IN ('General', 'Semi-Private', 'Private', 'ICU'));

ALTER TABLE beds
  ADD CONSTRAINT chk_bed_status
  CHECK (bed_status IN ('Available', 'Occupied', 'Maintenance'));

ALTER TABLE beds
  ADD CONSTRAINT chk_bed_daily_charge
  CHECK (daily_charge >= 0);

ALTER TABLE beds
  ADD CONSTRAINT uq_bed_number_ward
  UNIQUE (bed_number, ward_name);

-- 4. Check Constraints on Appointments
ALTER TABLE appointments
  ADD CONSTRAINT chk_appt_status
  CHECK (status IN ('Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show'));

ALTER TABLE appointments
  ADD CONSTRAINT chk_appt_end_after_start
  CHECK (appointment_end > appointment_start);

-- 5. Exclusion Constraints (Anti-Double-Booking via GiST)
-- Doctor overlap exclusion:
CREATE UNIQUE INDEX IF NOT EXISTS idx_anti_double_booking_doctor
  ON appointments USING GIST (
    doctor_id,
    tstzrange(appointment_start, appointment_end, '[)')
  )
  WHERE status NOT IN ('Cancelled', 'No Show');

-- Patient overlap exclusion:
CREATE UNIQUE INDEX IF NOT EXISTS idx_anti_double_booking_patient
  ON appointments USING GIST (
    patient_id,
    tstzrange(appointment_start, appointment_end, '[)')
  )
  WHERE status NOT IN ('Cancelled', 'No Show');

-- 6. Check Constraints on Admissions
ALTER TABLE admissions
  ADD CONSTRAINT chk_admission_status
  CHECK (status IN ('Active', 'Discharged', 'Transferred'));

ALTER TABLE admissions
  ADD CONSTRAINT chk_discharge_after_admission
  CHECK (discharge_datetime IS NULL OR discharge_datetime > admission_datetime);

-- Partial Unique Index: A bed can only have ONE active admission at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_admission_per_bed
  ON admissions (bed_id)
  WHERE status = 'Active';

-- 7. Constraints on Prescriptions & Line Items
ALTER TABLE prescriptions
  ADD CONSTRAINT chk_prescription_status
  CHECK (status IN ('Draft', 'Finalised'));

ALTER TABLE prescription_items
  ADD CONSTRAINT chk_prescription_item_qty
  CHECK (quantity > 0);

-- 8. Constraints on Bills & Bill Line Items
ALTER TABLE bills
  ADD CONSTRAINT chk_bill_status
  CHECK (status IN ('Pending', 'Partial', 'Paid', 'Overdue', 'Cancelled'));

ALTER TABLE bills
  ADD CONSTRAINT chk_bill_amounts
  CHECK (subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0);

ALTER TABLE bills
  ADD CONSTRAINT chk_bill_discount_limit
  CHECK (discount_amount <= subtotal);

ALTER TABLE bill_items
  ADD CONSTRAINT chk_bill_item_qty
  CHECK (quantity > 0);

ALTER TABLE bill_items
  ADD CONSTRAINT chk_bill_item_unit_price
  CHECK (unit_price >= 0);

-- 9. Constraints on Payments
ALTER TABLE payments
  ADD CONSTRAINT chk_payment_amount_positive
  CHECK (amount > 0);

ALTER TABLE payments
  ADD CONSTRAINT chk_payment_method
  CHECK (payment_method IN ('Cash', 'Card', 'UPI', 'Bank Transfer'));

ALTER TABLE payments
  ADD CONSTRAINT chk_payment_status
  CHECK (payment_status IN ('Pending', 'Completed', 'Failed', 'Refunded'));

-- ============================================================
-- PERFORMANCE & FILTERING INDEXES (B-Tree)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(is_active);

CREATE INDEX IF NOT EXISTS idx_doctors_dept ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(is_active);

CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(appointment_start);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);

CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed ON audit_logs(changed_at DESC);
