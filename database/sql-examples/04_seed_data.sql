-- ============================================================
-- 04_seed_data.sql
-- MediTrack: Reference Seed Data Loading
-- ============================================================

-- To execute the full, comprehensive seed dataset (15+ patients, 10 doctors,
-- 10 departments, 12 beds, 35+ appointments, 10 admissions, 10 prescriptions,
-- 15 bills, multiple payments), run the script located at:
-- database/seeds/seed_data.sql

-- Example Quick Seed for Viva Testing:
INSERT INTO departments (department_name, location, contact_number)
VALUES ('Demonstration OPD', 'Block Z, Floor 1', '080-9999-0001')
ON CONFLICT (department_name) DO NOTHING;

-- Verification Queries:
SELECT 'Total Departments' AS Metric, COUNT(*) AS Value FROM departments
UNION ALL
SELECT 'Total Doctors', COUNT(*) FROM doctors
UNION ALL
SELECT 'Total Patients', COUNT(*) FROM patients
UNION ALL
SELECT 'Total Beds', COUNT(*) FROM beds
UNION ALL
SELECT 'Total Appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'Active Admissions', COUNT(*) FROM admissions WHERE status = 'Active'
UNION ALL
SELECT 'Total Prescriptions', COUNT(*) FROM prescriptions
UNION ALL
SELECT 'Total Invoices', COUNT(*) FROM bills
UNION ALL
SELECT 'Completed Payments', COUNT(*) FROM payments WHERE payment_status = 'Completed';
