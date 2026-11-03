-- ============================================================
-- 07_join_queries.sql
-- MediTrack: Relational Joins (INNER JOIN, LEFT JOIN, Multi-Table)
-- ============================================================

-- 1. Two-Table INNER JOIN: Doctors with their Department
SELECT 
  d.doctor_code,
  d.full_name AS doctor_name,
  d.specialisation,
  dept.department_name,
  dept.location
FROM doctors d
INNER JOIN departments dept ON d.department_id = dept.department_id
WHERE d.is_active = true
ORDER BY dept.department_name, d.full_name;

-- 2. Three-Table INNER JOIN: Appointments with Patient and Doctor Details
SELECT 
  a.appointment_code,
  p.patient_code,
  p.full_name AS patient_name,
  p.phone AS patient_phone,
  d.full_name AS doctor_name,
  dept.department_name,
  a.appointment_start,
  a.status
FROM appointments a
INNER JOIN patients p ON a.patient_id = p.patient_id
INNER JOIN doctors d ON a.doctor_id = d.doctor_id
INNER JOIN departments dept ON a.department_id = dept.department_id
ORDER BY a.appointment_start DESC;

-- 3. Five-Table INNER JOIN: Inpatient Admissions with Complete Metadata
SELECT 
  adm.admission_code,
  p.full_name AS patient_name,
  d.full_name AS attending_doctor,
  dept.department_name,
  b.bed_number,
  b.ward_name,
  b.bed_type,
  b.daily_charge,
  adm.admission_datetime,
  adm.status
FROM admissions adm
INNER JOIN patients p ON adm.patient_id = p.patient_id
INNER JOIN doctors d ON adm.doctor_id = d.doctor_id
INNER JOIN departments dept ON adm.department_id = dept.department_id
INNER JOIN beds b ON adm.bed_id = b.bed_id
WHERE adm.status = 'Active';

-- 4. LEFT OUTER JOIN: All Patients, including those with NO Appointments
-- Demonstrates identifying patients who have registered but never booked
SELECT 
  p.patient_code,
  p.full_name,
  COUNT(a.appointment_id) AS total_appointments_booked
FROM patients p
LEFT OUTER JOIN appointments a ON p.patient_id = a.patient_id
GROUP BY p.patient_code, p.full_name
ORDER BY total_appointments_booked ASC, p.full_name;

-- 5. LEFT OUTER JOIN: All Departments, including any with NO Doctors
SELECT 
  dept.department_name,
  dept.location,
  COUNT(d.doctor_id) AS total_doctors
FROM departments dept
LEFT OUTER JOIN doctors d ON dept.department_id = d.department_id AND d.is_active = true
GROUP BY dept.department_name, dept.location
ORDER BY total_doctors ASC;

-- 6. Multi-Table LEFT JOIN with Aggregation: Bills with Payments & Balance
SELECT 
  b.bill_number,
  p.full_name AS patient_name,
  b.bill_date,
  b.total_amount AS billed_total,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'Completed'), 0) AS total_paid,
  b.total_amount - COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'Completed'), 0) AS balance_remaining,
  b.status AS bill_status
FROM bills b
INNER JOIN patients p ON b.patient_id = p.patient_id
LEFT OUTER JOIN payments pay ON b.bill_id = pay.bill_id
GROUP BY b.bill_id, b.bill_number, p.full_name, b.bill_date, b.total_amount, b.status
ORDER BY b.bill_date DESC;

-- 7. Self-Referential JOIN: Departments with their Head Physician
SELECT 
  dept.department_name,
  dept.location,
  COALESCE(hd.full_name, 'No Head Doctor Assigned') AS head_doctor_name,
  hd.qualification AS head_qualification
FROM departments dept
LEFT OUTER JOIN doctors hd ON dept.head_doctor_id = hd.doctor_id;
