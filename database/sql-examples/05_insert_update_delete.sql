-- ============================================================
-- 05_insert_update_delete.sql
-- MediTrack: DML Operations (INSERT, UPDATE, DELETE)
-- ============================================================

-- 1. INSERT Operations
-- Insert a demonstration patient record (auto-generates patient_code through trigger)
INSERT INTO patients (
  full_name, date_of_birth, gender, phone, email, address, blood_group
) VALUES (
  'Viva Demo Patient', '1992-05-15', 'Male', '9998887770', 'demo.patient@example.com', '101 Demonstration Road, Bengaluru', 'O+'
) RETURNING patient_id, patient_code, full_name, registered_at;

-- Insert an appointment for the demo patient
INSERT INTO appointments (
  patient_id, doctor_id, department_id, appointment_start, appointment_end, reason, status
) VALUES (
  (SELECT patient_id FROM patients WHERE phone = '9998887770' LIMIT 1),
  1,
  1,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day 30 minutes',
  'Viva test consultation',
  'Scheduled'
) RETURNING appointment_id, appointment_code, appointment_start, status;

-- 2. UPDATE Operations
-- Update patient's contact phone number and address
UPDATE patients
SET 
  phone = '9998887779',
  address = 'Updated Residential Address, Bengaluru',
  updated_at = NOW()
WHERE email = 'demo.patient@example.com'
RETURNING patient_id, full_name, phone, address, updated_at;

-- Update appointment status (from Scheduled to Checked In)
UPDATE appointments
SET 
  status = 'Checked In',
  updated_at = NOW()
WHERE reason = 'Viva test consultation'
RETURNING appointment_id, appointment_code, status, updated_at;

-- 3. DELETE Operations
-- Notice: Safe deletion only for disposable demo data.
-- Deleting the test appointment first to maintain referential integrity
DELETE FROM appointments
WHERE reason = 'Viva test consultation'
RETURNING appointment_id, appointment_code, reason;

-- Now delete the demo patient
DELETE FROM patients
WHERE email = 'demo.patient@example.com'
RETURNING patient_id, full_name, email;
