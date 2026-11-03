-- ============================================================
-- 12_reports.sql
-- MediTrack: Analytical & Management Reporting SQL Queries
-- ============================================================

-- REPORT 1: Appointment Performance Metrics
SELECT
  COUNT(*) AS total_appointments,
  COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled,
  COUNT(*) FILTER (WHERE status = 'No Show') AS no_show,
  ROUND(COUNT(*) FILTER (WHERE status = 'Completed') * 100.0 / NULLIF(COUNT(*), 0), 2) AS completion_rate_pct
FROM appointments
WHERE appointment_start >= CURRENT_DATE - INTERVAL '90 days';

-- REPORT 2: Doctor Productivity and Active Workload
SELECT
  d.doctor_id,
  d.doctor_code,
  d.full_name AS doctor_name,
  dept.department_name,
  COUNT(a.appointment_id) AS total_assigned_appointments,
  COUNT(a.appointment_id) FILTER (WHERE a.status = 'Completed') AS completed_appointments,
  COUNT(a.appointment_id) FILTER (WHERE a.appointment_start > NOW() AND a.status NOT IN ('Cancelled', 'No Show')) AS upcoming_scheduled
FROM doctors d
LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
LEFT JOIN departments dept ON d.department_id = dept.department_id
WHERE d.is_active = true
GROUP BY d.doctor_id, d.doctor_code, d.full_name, dept.department_name
ORDER BY total_assigned_appointments DESC;

-- REPORT 3: Hospital Ward Bed Occupancy Breakdown
SELECT
  b.ward_name,
  dept.department_name,
  COUNT(*) AS total_beds,
  COUNT(*) FILTER (WHERE b.bed_status = 'Occupied') AS occupied_beds,
  COUNT(*) FILTER (WHERE b.bed_status = 'Available') AS available_beds,
  ROUND(COUNT(*) FILTER (WHERE b.bed_status = 'Occupied') * 100.0 / NULLIF(COUNT(*), 0), 1) AS occupancy_pct
FROM beds b
JOIN departments dept ON b.department_id = dept.department_id
GROUP BY b.ward_name, dept.department_name
ORDER BY occupancy_pct DESC;

-- REPORT 4: Financial Revenue Realization Analysis
SELECT
  COUNT(DISTINCT b.bill_id) AS total_invoices_issued,
  COALESCE(SUM(b.total_amount), 0) AS gross_invoiced_value,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'Completed'), 0) AS total_cash_collected,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('Paid', 'Cancelled')), 0) AS ledger_outstanding_debt
FROM bills b
LEFT JOIN payments p ON b.bill_id = p.bill_id;

-- REPORT 5: Inpatient Stay Duration (LOS) Statistics
SELECT
  COUNT(*) AS total_admissions,
  COUNT(*) FILTER (WHERE status = 'Active') AS current_inpatients,
  COUNT(*) FILTER (WHERE status = 'Discharged') AS completed_discharges,
  ROUND(AVG(EXTRACT(EPOCH FROM COALESCE(discharge_datetime, NOW()) - admission_datetime)/86400), 1) AS avg_stay_days,
  ROUND(MIN(EXTRACT(EPOCH FROM discharge_datetime - admission_datetime)/86400), 1) AS min_stay_days,
  ROUND(MAX(EXTRACT(EPOCH FROM discharge_datetime - admission_datetime)/86400), 1) AS max_stay_days
FROM admissions;
