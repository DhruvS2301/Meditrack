-- ============================================================
-- 10_views_functions_triggers.sql
-- MediTrack: Relational Views, Stored Functions, and Triggers
-- ============================================================

-- 1. RELATIONAL VIEW: Appointment Details with Enriched Names
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

-- Query the View:
SELECT * FROM v_appointment_details WHERE status = 'Confirmed';

-- 2. RELATIONAL VIEW: Active Inpatient Admissions with Real-time Stay Days
CREATE OR REPLACE VIEW v_current_admissions AS
SELECT
  adm.admission_id,
  adm.admission_code,
  adm.admission_datetime,
  adm.admission_reason,
  adm.status,
  p.patient_id,
  p.patient_code,
  p.full_name AS patient_name,
  d.full_name AS doctor_name,
  dept.department_name,
  b.bed_number,
  b.ward_name,
  b.bed_type,
  ROUND(EXTRACT(EPOCH FROM NOW() - adm.admission_datetime) / 86400, 1) AS days_admitted
FROM admissions adm
JOIN patients p ON adm.patient_id = p.patient_id
JOIN doctors d ON adm.doctor_id = d.doctor_id
JOIN departments dept ON adm.department_id = dept.department_id
JOIN beds b ON adm.bed_id = b.bed_id
WHERE adm.status = 'Active';

-- Query the Inpatient View:
SELECT * FROM v_current_admissions;

-- 3. STORED FUNCTION: Calculate Admission Duration in Days
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

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN ROUND(EXTRACT(EPOCH FROM v_end - v_start) / 86400, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Test the Stored Function:
SELECT admission_id, admission_code, fn_stay_duration(admission_id) AS computed_stay_days
FROM admissions
LIMIT 5;

-- 4. STORED FUNCTION: Compute Real-time Outstanding Bill Balance
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
  
  RETURN COALESCE(v_total - v_paid, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Test the Balance Function:
SELECT bill_id, bill_number, total_amount, fn_bill_outstanding(bill_id) AS live_balance
FROM bills
LIMIT 5;

-- 5. TRIGGER: Automatic Audit Logging on Status Mutation
CREATE OR REPLACE FUNCTION trg_audit_appointment_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
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

-- Bind Trigger to Appointments Table:
DROP TRIGGER IF EXISTS trg_audit_appointment ON appointments;
CREATE TRIGGER trg_audit_appointment
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trg_audit_appointment_fn();
