-- ============================================================
-- 09_aggregate_group_by_having.sql
-- MediTrack: Aggregations, GROUP BY, and HAVING Clauses
-- ============================================================

-- 1. Standard Aggregates across Entire Table
SELECT 
  COUNT(*) AS total_bills,
  SUM(total_amount) AS gross_billed_value,
  ROUND(AVG(total_amount), 2) AS average_bill_amount,
  MIN(total_amount) AS lowest_bill_amount,
  MAX(total_amount) AS highest_bill_amount
FROM bills;

-- 2. GROUP BY Single Column: Appointment Counts by Status
SELECT 
  status AS appointment_status,
  COUNT(*) AS frequency,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM appointments), 1) AS percentage_of_total
FROM appointments
GROUP BY status
ORDER BY frequency DESC;

-- 3. GROUP BY with Multiple Columns: Bed Inventory by Ward and Bed Type
SELECT 
  ward_name,
  bed_type,
  COUNT(*) AS total_beds,
  COUNT(*) FILTER (WHERE bed_status = 'Available') AS available_count,
  COUNT(*) FILTER (WHERE bed_status = 'Occupied') AS occupied_count,
  ROUND(AVG(daily_charge), 2) AS average_daily_charge
FROM beds
GROUP BY ward_name, bed_type
ORDER BY ward_name, bed_type;

-- 4. GROUP BY with HAVING: Doctors with MORE than 3 Consultations
-- Demonstrates difference between WHERE (filters rows before aggregation)
-- and HAVING (filters groups after aggregation)
SELECT 
  d.doctor_id,
  d.full_name AS doctor_name,
  d.specialisation,
  COUNT(a.appointment_id) AS total_appointments
FROM doctors d
JOIN appointments a ON d.doctor_id = a.doctor_id
GROUP BY d.doctor_id, d.full_name, d.specialisation
HAVING COUNT(a.appointment_id) > 3
ORDER BY total_appointments DESC;

-- 5. GROUP BY with Date Truncation: Monthly Patient Registrations
SELECT 
  TO_CHAR(DATE_TRUNC('month', registered_at), 'YYYY-MM') AS registration_month,
  COUNT(*) AS new_patients_registered
FROM patients
GROUP BY DATE_TRUNC('month', registered_at)
ORDER BY registration_month ASC;

-- 6. GROUP BY with HAVING & Multiple Aggregates: High-Volume Revenue Months
SELECT 
  TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM') AS revenue_month,
  COUNT(*) AS successful_transactions,
  SUM(amount) AS total_revenue_collected,
  ROUND(AVG(amount), 2) AS average_payment_size
FROM payments
WHERE payment_status = 'Completed'
GROUP BY DATE_TRUNC('month', payment_date)
HAVING SUM(amount) >= 5000.00
ORDER BY revenue_month DESC;

-- 7. GROUP BY across Joined Tables: Department Inpatient Admissions
SELECT 
  dept.department_name,
  COUNT(adm.admission_id) AS total_admissions,
  COUNT(adm.admission_id) FILTER (WHERE adm.status = 'Active') AS currently_admitted
FROM departments dept
LEFT JOIN admissions adm ON dept.department_id = adm.department_id
GROUP BY dept.department_id, dept.department_name
ORDER BY total_admissions DESC;
