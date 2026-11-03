-- ============================================================
-- MediTrack Database Migration 003
-- Indexes, Views, Functions
-- ============================================================

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_registered ON patients(registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_doctors_department ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(is_active);

CREATE INDEX IF NOT EXISTS idx_appt_start ON appointments(appointment_start);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_datetime ON admissions(admission_datetime DESC);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date DESC);

CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed ON audit_logs(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(bed_status);
CREATE INDEX IF NOT EXISTS idx_beds_dept ON beds(department_id);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_appointment_details AS
SELECT
  a.appointment_id,
  a.appointment_code,
  a.appointment_start,
  a.appointment_end,
  a.reason,
  a.status,
  p.patient_id,
  p.patient_code,
  p.full_name AS patient_name,
  p.phone AS patient_phone,
  d.doctor_id,
  d.doctor_code,
  d.full_name AS doctor_name,
  d.specialisation,
  dept.department_id,
  dept.department_name,
  a.created_at
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN doctors d ON a.doctor_id = d.doctor_id
JOIN departments dept ON a.department_id = dept.department_id;

CREATE OR REPLACE VIEW v_current_admissions AS
SELECT
  adm.admission_id,
  adm.admission_code,
  adm.admission_datetime,
  adm.admission_reason,
  adm.expected_discharge_date,
  adm.status,
  p.patient_id,
  p.patient_code,
  p.full_name AS patient_name,
  d.full_name AS doctor_name,
  dept.department_name,
  b.bed_number,
  b.ward_name,
  b.bed_type,
  b.daily_charge,
  ROUND(EXTRACT(EPOCH FROM NOW() - adm.admission_datetime) / 86400, 1) AS days_admitted
FROM admissions adm
JOIN patients p ON adm.patient_id = p.patient_id
JOIN doctors d ON adm.doctor_id = d.doctor_id
JOIN departments dept ON adm.department_id = dept.department_id
JOIN beds b ON adm.bed_id = b.bed_id
WHERE adm.status = 'Active';

CREATE OR REPLACE VIEW v_bed_occupancy AS
SELECT
  b.bed_id,
  b.bed_number,
  b.ward_name,
  b.bed_type,
  b.bed_status,
  b.daily_charge,
  dept.department_name,
  adm.admission_code,
  p.full_name AS current_patient,
  adm.admission_datetime
FROM beds b
JOIN departments dept ON b.department_id = dept.department_id
LEFT JOIN admissions adm ON adm.bed_id = b.bed_id AND adm.status = 'Active'
LEFT JOIN patients p ON adm.patient_id = p.patient_id;

CREATE OR REPLACE VIEW v_bill_balances AS
SELECT
  b.bill_id,
  b.bill_number,
  b.bill_date,
  b.total_amount,
  b.status,
  p.full_name AS patient_name,
  p.patient_code,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'Completed'), 0) AS amount_paid,
  b.total_amount - COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'Completed'), 0) AS outstanding
FROM bills b
JOIN patients p ON b.patient_id = p.patient_id
LEFT JOIN payments pay ON b.bill_id = pay.bill_id
GROUP BY b.bill_id, p.full_name, p.patient_code;

CREATE OR REPLACE VIEW v_doctor_workload AS
SELECT
  d.doctor_id,
  d.doctor_code,
  d.full_name AS doctor_name,
  d.specialisation,
  dept.department_name,
  COUNT(a.appointment_id) AS total_appointments,
  COUNT(a.appointment_id) FILTER (WHERE a.status = 'Completed') AS completed_appointments,
  COUNT(a.appointment_id) FILTER (WHERE a.appointment_start > NOW() AND a.status NOT IN ('Cancelled','No Show')) AS upcoming_appointments
FROM doctors d
LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
LEFT JOIN departments dept ON d.department_id = dept.department_id
WHERE d.is_active = true
GROUP BY d.doctor_id, d.doctor_code, d.full_name, d.specialisation, dept.department_name;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Calculate stay duration in days
CREATE OR REPLACE FUNCTION fn_stay_duration(
  p_admission_id BIGINT
) RETURNS NUMERIC AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end   TIMESTAMPTZ;
BEGIN
  SELECT admission_datetime, COALESCE(discharge_datetime, NOW())
  INTO v_start, v_end
  FROM admissions WHERE admission_id = p_admission_id;

  RETURN ROUND(EXTRACT(EPOCH FROM v_end - v_start) / 86400, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Calculate outstanding bill balance
CREATE OR REPLACE FUNCTION fn_bill_outstanding(
  p_bill_id BIGINT
) RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
  v_paid  NUMERIC;
BEGIN
  SELECT total_amount INTO v_total FROM bills WHERE bill_id = p_bill_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments WHERE bill_id = p_bill_id AND payment_status = 'Completed';
  RETURN v_total - v_paid;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- APPOINTMENT AUDIT TRIGGER
-- ============================================================
-- The trigger function was defined in migration 002 but needs
-- to reference audit_logs which is now created. Add trigger here.

CREATE OR REPLACE FUNCTION trg_audit_appointment_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only log meaningful changes (not every updated_at bump)
    IF OLD.status IS DISTINCT FROM NEW.status
       OR OLD.appointment_start IS DISTINCT FROM NEW.appointment_start
       OR OLD.appointment_end IS DISTINCT FROM NEW.appointment_end THEN
      INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
      VALUES (
        'appointment',
        NEW.appointment_id,
        'STATUS_CHANGE',
        jsonb_build_object('status', OLD.status, 'start', OLD.appointment_start),
        jsonb_build_object('status', NEW.status, 'start', NEW.appointment_start)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_audit_appointment
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trg_audit_appointment_fn();
