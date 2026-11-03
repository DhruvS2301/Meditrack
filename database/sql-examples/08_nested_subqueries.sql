-- ============================================================
-- 08_nested_subqueries.sql
-- MediTrack: Nested Subqueries & Correlated Subqueries
-- ============================================================

-- 1. Scalar Subquery in WHERE: Bills Above Average Invoice Amount
SELECT 
  bill_number,
  patient_id,
  total_amount,
  status
FROM bills
WHERE total_amount > (
  SELECT AVG(total_amount) FROM bills
)
ORDER BY total_amount DESC;

-- 2. Correlated Subquery with NOT EXISTS: Patients with NO Appointments
-- Essential DBMS viva concept: Evaluated once per candidate outer row
SELECT 
  p.patient_id,
  p.patient_code,
  p.full_name,
  p.phone
FROM patients p
WHERE NOT EXISTS (
  SELECT 1 
  FROM appointments a 
  WHERE a.patient_id = p.patient_id
);

-- 3. Correlated Subquery with EXISTS: Doctors who have Admitted Inpatients
SELECT 
  d.doctor_id,
  d.doctor_code,
  d.full_name,
  d.specialisation
FROM doctors d
WHERE EXISTS (
  SELECT 1 
  FROM admissions adm 
  WHERE adm.doctor_id = d.doctor_id
);

-- 4. Subquery with IN Operator: Beds Currently Assigned to Active Inpatients
SELECT 
  bed_number,
  ward_name,
  bed_type,
  daily_charge
FROM beds
WHERE bed_id IN (
  SELECT bed_id 
  FROM admissions 
  WHERE status = 'Active'
);

-- 5. Subquery in FROM Clause (Derived Table): Doctors Exceeding Average Workload
SELECT 
  doctor_name,
  appointment_count
FROM (
  SELECT 
    d.full_name AS doctor_name,
    COUNT(a.appointment_id) AS appointment_count
  FROM doctors d
  LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
  GROUP BY d.doctor_id, d.full_name
) AS doctor_stats
WHERE appointment_count > (
  SELECT AVG(cnt)
  FROM (
    SELECT COUNT(appointment_id) AS cnt
    FROM appointments
    GROUP BY doctor_id
  ) AS inner_counts
);

-- 6. Correlated Subquery in SELECT Clause: Patient with their Latest Appointment Date
SELECT 
  p.patient_code,
  p.full_name,
  (
    SELECT MAX(a.appointment_start)
    FROM appointments a
    WHERE a.patient_id = p.patient_id
  ) AS latest_appointment_time
FROM patients p
ORDER BY p.patient_code;

-- 7. Subquery with ALL: Find the Most Expensive Bill Generated
SELECT 
  bill_number,
  total_amount,
  bill_date
FROM bills
WHERE total_amount >= ALL (
  SELECT total_amount FROM bills
);
