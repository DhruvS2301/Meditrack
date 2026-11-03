-- ============================================================
-- 06_basic_select_queries.sql
-- MediTrack: Basic SELECT, Filtering, Ordering & Projection
-- ============================================================

-- 1. Simple Projection and Aliasing
SELECT 
  patient_id AS id,
  patient_code AS code,
  full_name AS patient_name,
  gender,
  phone,
  registered_at::DATE AS registration_date
FROM patients
WHERE is_active = true
ORDER BY full_name ASC;

-- 2. Range & Pattern Filtering (WHERE, ILIKE, BETWEEN)
-- Find doctors whose consultation fee is between 500 and 800
SELECT 
  doctor_code,
  full_name,
  specialisation,
  consultation_fee
FROM doctors
WHERE consultation_fee BETWEEN 500.00 AND 800.00
ORDER BY consultation_fee DESC;

-- 3. Case-Insensitive Pattern Match (ILIKE)
-- Search patients whose name or phone starts with specific digits
SELECT 
  patient_code,
  full_name,
  phone,
  blood_group
FROM patients
WHERE full_name ILIKE '%kumar%' OR phone LIKE '9000000001%';

-- 4. DISTINCT values
-- Find all unique blood groups currently represented in registered patients
SELECT DISTINCT 
  blood_group 
FROM patients 
WHERE blood_group IS NOT NULL 
ORDER BY blood_group;

-- 5. Date and Timestamp Filtering
-- Appointments scheduled within the last 30 days
SELECT 
  appointment_code,
  appointment_start,
  appointment_end,
  status,
  reason
FROM appointments
WHERE appointment_start >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY appointment_start DESC;

-- 6. Filtering with NULL checks & IS NOT NULL
-- Patients with documented emergency contacts
SELECT 
  patient_code,
  full_name,
  emergency_contact_name,
  emergency_contact_phone
FROM patients
WHERE emergency_contact_name IS NOT NULL
ORDER BY full_name;

-- 7. Pagination with LIMIT and OFFSET
-- Page 2 of patients with 5 records per page
SELECT 
  patient_id, 
  patient_code, 
  full_name, 
  registered_at
FROM patients
ORDER BY registered_at DESC
LIMIT 5 OFFSET 5;
