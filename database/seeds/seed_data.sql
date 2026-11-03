-- ============================================================
-- MediTrack Seed Data
-- Run this AFTER all migrations have been applied.
-- Reset: TRUNCATE patients, doctors, departments, beds,
--        appointments, admissions, prescriptions, prescription_items,
--        bills, bill_items, payments, audit_logs CASCADE;
-- ============================================================

BEGIN;

-- Truncate in correct order
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE bill_items CASCADE;
TRUNCATE TABLE bills CASCADE;
TRUNCATE TABLE prescription_items CASCADE;
TRUNCATE TABLE prescriptions CASCADE;
TRUNCATE TABLE admissions CASCADE;
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE beds CASCADE;
TRUNCATE TABLE doctors CASCADE;
TRUNCATE TABLE departments CASCADE;

-- Reset sequences
ALTER SEQUENCE patient_code_seq RESTART WITH 1;
ALTER SEQUENCE doctor_code_seq RESTART WITH 1;
ALTER SEQUENCE appointment_code_seq RESTART WITH 1;
ALTER SEQUENCE admission_code_seq RESTART WITH 1;
ALTER SEQUENCE prescription_code_seq RESTART WITH 1;
ALTER SEQUENCE bill_number_seq RESTART WITH 1;

-- ============================================================
-- DEPARTMENTS (10)
-- ============================================================
INSERT INTO departments (department_name, description, location, contact_number)
VALUES
  ('General Medicine',   'Primary care and internal medicine services',    'Block A, Floor 1', '080-1111-0001'),
  ('Cardiology',         'Diagnosis and treatment of heart conditions',    'Block B, Floor 2', '080-1111-0002'),
  ('Orthopaedics',       'Bone, joint, and musculoskeletal services',      'Block A, Floor 3', '080-1111-0003'),
  ('Paediatrics',        'Medical care for infants and children',          'Block C, Floor 1', '080-1111-0004'),
  ('Dermatology',        'Skin, hair, and nail conditions',                'Block B, Floor 1', '080-1111-0005'),
  ('Neurology',          'Brain and nervous system disorders',             'Block C, Floor 2', '080-1111-0006'),
  ('Gynaecology',        'Female reproductive health services',            'Block D, Floor 1', '080-1111-0007'),
  ('Emergency',          '24/7 emergency and trauma services',             'Block E, Floor G', '080-1111-0008'),
  ('Radiology',          'Imaging and diagnostic radiology',               'Block A, Floor B', '080-1111-0009'),
  ('General Surgery',    'Elective and emergency surgical procedures',     'Block B, Floor 3', '080-1111-0010');

-- ============================================================
-- DOCTORS (10)
-- ============================================================
INSERT INTO doctors (full_name, email, phone, department_id, specialisation, qualification, experience_years, consultation_fee)
VALUES
  ('Dr. Priya Sharma',     'priya.sharma@meditrack.local',     '9876543201', 1, 'Internal Medicine',    'MBBS, MD',       12, 500.00),
  ('Dr. Rohan Mehta',      'rohan.mehta@meditrack.local',      '9876543202', 2, 'Interventional Cardiology', 'MBBS, DM Cardiology', 15, 800.00),
  ('Dr. Kavya Nair',       'kavya.nair@meditrack.local',       '9876543203', 3, 'Spine Surgery',        'MBBS, MS Ortho', 10, 700.00),
  ('Dr. Arjun Patel',      'arjun.patel@meditrack.local',      '9876543204', 4, 'Neonatology',          'MBBS, MD Paeds', 8,  600.00),
  ('Dr. Sneha Krishnan',   'sneha.krishnan@meditrack.local',   '9876543205', 5, 'Clinical Dermatology', 'MBBS, DVD',      6,  450.00),
  ('Dr. Vikram Rao',       'vikram.rao@meditrack.local',       '9876543206', 6, 'Epilepsy & Movement Disorders', 'MBBS, DM Neurology', 14, 750.00),
  ('Dr. Ananya Gupta',     'ananya.gupta@meditrack.local',     '9876543207', 7, 'Obstetrics & Gynaecology', 'MBBS, MS OBG', 9, 600.00),
  ('Dr. Siddharth Joshi',  'siddharth.joshi@meditrack.local',  '9876543208', 8, 'Emergency Medicine',   'MBBS, MD EM',    7,  400.00),
  ('Dr. Pooja Iyer',       'pooja.iyer@meditrack.local',       '9876543209', 9, 'Musculoskeletal Radiology', 'MBBS, MD Radio', 11, 550.00),
  ('Dr. Kiran Bhat',       'kiran.bhat@meditrack.local',       '9876543210', 10, 'Laparoscopic Surgery', 'MBBS, MS Surgery', 13, 700.00);

-- Set some heads of department
UPDATE departments SET head_doctor_id = (SELECT doctor_id FROM doctors WHERE full_name = 'Dr. Priya Sharma') WHERE department_name = 'General Medicine';
UPDATE departments SET head_doctor_id = (SELECT doctor_id FROM doctors WHERE full_name = 'Dr. Rohan Mehta') WHERE department_name = 'Cardiology';
UPDATE departments SET head_doctor_id = (SELECT doctor_id FROM doctors WHERE full_name = 'Dr. Kavya Nair') WHERE department_name = 'Orthopaedics';

-- ============================================================
-- BEDS (12)
-- ============================================================
INSERT INTO beds (bed_number, ward_name, department_id, bed_type, daily_charge, bed_status)
SELECT 'GM-' || n, 'General Ward', 1, 'General', 800.00, 'Available'
FROM generate_series(1, 3) n;

INSERT INTO beds (bed_number, ward_name, department_id, bed_type, daily_charge, bed_status)
VALUES
  ('CARD-01', 'Cardiology Ward', 2, 'Private',      2500.00, 'Available'),
  ('CARD-02', 'Cardiology Ward', 2, 'Semi-Private',  1500.00, 'Available'),
  ('ICU-01',  'ICU',             2, 'ICU',           5000.00, 'Available'),
  ('ORTH-01', 'Ortho Ward',      3, 'Semi-Private',  1500.00, 'Available'),
  ('ORTH-02', 'Ortho Ward',      3, 'General',        800.00, 'Available'),
  ('PEDS-01', 'Paediatric Ward', 4, 'General',        900.00, 'Available'),
  ('NEURO-01','Neuro Ward',      6, 'Private',       2000.00, 'Available'),
  ('SURG-01', 'Surgical Ward',  10, 'Semi-Private',  1800.00, 'Maintenance'),
  ('SURG-02', 'Surgical Ward',  10, 'General',       1000.00, 'Available');

-- ============================================================
-- PATIENTS (15)
-- ============================================================
INSERT INTO patients (full_name, date_of_birth, gender, phone, email, address, blood_group, emergency_contact_name, emergency_contact_phone)
VALUES
  ('Ravi Kumar',       '1980-03-15', 'Male',   '9000000001', 'ravi.kumar@email.com',      '12 MG Road, Bengaluru',     'A+',  'Meena Kumar',    '9000000101'),
  ('Sunita Verma',     '1972-07-22', 'Female', '9000000002', 'sunita.verma@email.com',    '34 Indiranagar, Bengaluru', 'B+',  'Raj Verma',      '9000000102'),
  ('Aditya Singh',     '1995-11-08', 'Male',   '9000000003', NULL,                        '56 Koramangala, Bengaluru', 'O+',  'Priya Singh',    '9000000103'),
  ('Lakshmi Devi',     '1965-01-30', 'Female', '9000000004', 'lakshmi.d@email.com',       '78 Jayanagar, Bengaluru',   'AB+', 'Murali Devi',    '9000000104'),
  ('Mohan Pillai',     '1988-09-17', 'Male',   '9000000005', 'mohan.p@email.com',         '90 HSR Layout, Bengaluru',  'B-',  'Geetha Pillai',  '9000000105'),
  ('Kavitha Reddy',    '2000-04-05', 'Female', '9000000006', 'kavitha.r@email.com',       '15 BTM Layout, Bengaluru',  'O-',  'Srinivas Reddy', '9000000106'),
  ('Prakash Jain',     '1958-12-20', 'Male',   '9000000007', NULL,                        '22 RT Nagar, Bengaluru',    'A-',  'Sushma Jain',    '9000000107'),
  ('Divya Menon',      '1993-06-14', 'Female', '9000000008', 'divya.m@email.com',         '44 Whitefield, Bengaluru',  'B+',  'Ajay Menon',     '9000000108'),
  ('Suresh Babu',      '1970-08-25', 'Male',   '9000000009', 'suresh.b@email.com',        '66 Yelahanka, Bengaluru',   'A+',  'Rani Babu',      '9000000109'),
  ('Anitha Nair',      '1985-02-11', 'Female', '9000000010', 'anitha.n@email.com',        '88 Rajajinagar, Bengaluru', 'O+',  'Sajan Nair',     '9000000110'),
  ('Deepak Sharma',    '1998-10-03', 'Male',   '9000000011', NULL,                        '100 Mathikere, Bengaluru',  'AB-', 'Rekha Sharma',   '9000000111'),
  ('Preeti Kapoor',    '1976-05-28', 'Female', '9000000012', 'preeti.k@email.com',        '23 Sadashivanagar, Bengaluru','B+', 'Vinod Kapoor',   '9000000112'),
  ('Ramesh Yadav',     '1962-03-09', 'Male',   '9000000013', 'ramesh.y@email.com',        '45 Vijayanagar, Bengaluru', 'A+',  'Savitha Yadav',  '9000000113'),
  ('Nisha Choudhary',  '1991-07-16', 'Female', '9000000014', NULL,                        '67 Malleshwaram, Bengaluru','O+',  'Ajit Choudhary', '9000000114'),
  ('Amit Bose',        '1983-12-01', 'Male',   '9000000015', 'amit.bose@email.com',       '89 Bannerghatta, Bengaluru','B-',  'Sonia Bose',     '9000000115');

-- ============================================================
-- APPOINTMENTS (30+)
-- ============================================================
-- Use patient_id and doctor_id from the inserts above
-- patient_id 1-15, doctor_id 1-10
-- Spread across past 3 months and upcoming

DO $$
DECLARE
  appt_data RECORD;
BEGIN
  -- Historical completed appointments (past)
  FOR appt_data IN
    SELECT * FROM (VALUES
      (1,  1, 1,  NOW() - INTERVAL '85 days', NOW() - INTERVAL '85 days' + INTERVAL '30 min', 'Fever and fatigue', 'Completed'),
      (2,  2, 2,  NOW() - INTERVAL '80 days', NOW() - INTERVAL '80 days' + INTERVAL '45 min', 'Chest pain evaluation', 'Completed'),
      (3,  3, 3,  NOW() - INTERVAL '75 days', NOW() - INTERVAL '75 days' + INTERVAL '30 min', 'Knee pain', 'Completed'),
      (4,  4, 4,  NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days' + INTERVAL '30 min', 'Child vaccination', 'Completed'),
      (5,  5, 5,  NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days' + INTERVAL '20 min', 'Skin rash', 'Completed'),
      (6,  6, 6,  NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days' + INTERVAL '40 min', 'Persistent headache', 'Completed'),
      (7,  7, 7,  NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days' + INTERVAL '30 min', 'Gynaecology checkup', 'Completed'),
      (8,  8, 8,  NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days' + INTERVAL '20 min', 'Emergency - injury', 'Completed'),
      (9,  9, 9,  NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days' + INTERVAL '30 min', 'X-ray review', 'Completed'),
      (10, 10, 10, NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days' + INTERVAL '45 min', 'Post-op checkup', 'Completed'),
      (1,  1, 1,  NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days' + INTERVAL '30 min', 'Follow-up visit', 'Completed'),
      (2,  2, 2,  NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '30 min', 'ECG review', 'Completed'),
      (11, 1, 1,  NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days' + INTERVAL '30 min', 'General checkup', 'Completed'),
      (12, 5, 5,  NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days' + INTERVAL '20 min', 'Acne treatment', 'Completed'),
      (13, 2, 2,  NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days' + INTERVAL '30 min', 'Blood pressure check', 'No Show'),
      (14, 6, 6,  NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '40 min', 'Epilepsy follow-up', 'Completed'),
      (15, 3, 3,  NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days' + INTERVAL '30 min', 'Back pain evaluation', 'Cancelled'),
      (3,  1, 1,  NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '20 min', 'Routine check', 'Completed'),
      (4,  7, 7,  NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days' + INTERVAL '30 min', 'Pregnancy checkup', 'Completed'),
      (5,  10, 10, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '30 min', 'Surgical consultation', 'Completed'),
      (6,  2, 2,  NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '30 min', 'Echocardiogram review', 'Completed'),
      (7,  1, 1,  NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '30 min', 'Diabetes management', 'Completed'),
      (8,  6, 6,  NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 min', 'MRI review', 'Completed'),
      (9,  3, 3,  NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '30 min', 'Physiotherapy referral', 'Cancelled'),
      -- Recent and today
      (1,  1, 1,  NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 min', 'Follow-up for fever', 'Completed'),
      (2,  2, 2,  NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 hour 30 min', 'Stress test review', 'Scheduled'),
      (3,  3, 3,  NOW() + INTERVAL '2 hours', NOW() + INTERVAL '2 hours 30 min', 'Post-op follow-up', 'Confirmed'),
      (10, 4, 4,  NOW() + INTERVAL '3 hours', NOW() + INTERVAL '3 hours 30 min', 'Vaccination booster', 'Scheduled'),
      (11, 5, 5,  NOW() + INTERVAL '4 hours', NOW() + INTERVAL '4 hours 20 min', 'Eczema consultation', 'Scheduled'),
      (12, 6, 6,  NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours 40 min', 'Migraine management', 'Confirmed'),
      -- Future upcoming
      (13, 7, 7,  NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '30 min', 'Antenatal care', 'Scheduled'),
      (14, 10, 10, NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '45 min', 'Hernia consultation', 'Scheduled'),
      (15, 1, 1,  NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '30 min', 'Hypertension review', 'Scheduled'),
      (6,  8, 8,  NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '20 min', 'Emergency follow-up', 'Scheduled')
    ) AS t(pid, did, dept_id, astart, aend, reason, status)
  LOOP
    INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_start, appointment_end, reason, status)
    VALUES (appt_data.pid, appt_data.did, appt_data.dept_id,
            appt_data.astart, appt_data.aend, appt_data.reason, appt_data.status);
  END LOOP;
END $$;

-- ============================================================
-- ADMISSIONS (10)
-- ============================================================
-- Admit some patients to beds and mark beds as occupied

-- First 3 active admissions (current)
INSERT INTO admissions (patient_id, doctor_id, department_id, bed_id, admission_datetime, admission_reason, initial_notes, status)
VALUES
  (2, 2, 2, (SELECT bed_id FROM beds WHERE bed_number = 'CARD-01'), NOW() - INTERVAL '5 days',
   'Acute chest pain requiring monitoring', 'ECG shows ST elevation, further monitoring required', 'Active'),
  (6, 6, 6, (SELECT bed_id FROM beds WHERE bed_number = 'NEURO-01'), NOW() - INTERVAL '3 days',
   'Severe epileptic episode', 'Patient stabilised on medication', 'Active'),
  (9, 10, 10, (SELECT bed_id FROM beds WHERE bed_number = 'SURG-02'), NOW() - INTERVAL '1 day',
   'Appendicitis - pre-operative admission', 'Scheduled for laparoscopic appendectomy', 'Active');

-- Mark those beds occupied
UPDATE beds SET bed_status = 'Occupied' WHERE bed_number = 'CARD-01';
UPDATE beds SET bed_status = 'Occupied' WHERE bed_number = 'NEURO-01';
UPDATE beds SET bed_status = 'Occupied' WHERE bed_number = 'SURG-02';

-- Historical discharged admissions
INSERT INTO admissions (patient_id, doctor_id, department_id, bed_id, admission_datetime, discharge_datetime, admission_reason, discharge_notes, status)
VALUES
  (1, 1, 1, (SELECT bed_id FROM beds WHERE bed_number = 'GM-1'),
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '57 days',
   'Typhoid fever - high-grade fever for 5 days', 'Patient fully recovered, discharged on oral antibiotics', 'Discharged'),
  (3, 3, 3, (SELECT bed_id FROM beds WHERE bed_number = 'ORTH-01'),
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '40 days',
   'Fractured right femur - road traffic accident', 'Post-operative recovery complete', 'Discharged'),
  (4, 4, 4, (SELECT bed_id FROM beds WHERE bed_number = 'PEDS-01'),
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days',
   'Febrile seizure in 3-year-old child', 'Child stable, fever managed, discharged with follow-up instructions', 'Discharged'),
  (7, 2, 2, (SELECT bed_id FROM beds WHERE bed_number = 'CARD-02'),
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '17 days',
   'Congestive heart failure exacerbation', 'Stabilised, discharged on adjusted medication', 'Discharged'),
  (10, 7, 7, (SELECT bed_id FROM beds WHERE bed_number = 'GM-2'),
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days',
   'Post-partum care', 'Normal delivery, mother and child healthy', 'Discharged'),
  (13, 1, 1, (SELECT bed_id FROM beds WHERE bed_number = 'GM-3'),
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '6 days',
   'Diabetic ketoacidosis', 'Blood sugar controlled, discharged on insulin regimen', 'Discharged'),
  (5, 6, 6, (SELECT bed_id FROM beds WHERE bed_number = 'ICU-01'),
   NOW() - INTERVAL '70 days', NOW() - INTERVAL '65 days',
   'Ischaemic stroke', 'Patient showed improvement, transferred to general ward and then discharged', 'Discharged');

-- ============================================================
-- PRESCRIPTIONS (10+)
-- ============================================================
DO $$
DECLARE
  rx_id BIGINT;
BEGIN
  -- RX 1
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (1, 1, CURRENT_DATE - 85, 'Post-fever prescription', 'Finalised')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Paracetamol 500mg', '1 tablet for fever above 38.5°C', 'Every 6 hours as needed', '5 days', 20, 'Oral'),
    (rx_id, 'ORS Sachets', 'Dissolve in 1L water', 'As needed for hydration', '7 days', 14, 'Oral');

  -- RX 2
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (2, 2, CURRENT_DATE - 80, 'Post cardiac evaluation', 'Finalised')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Aspirin 75mg', '1 tablet daily after meals', 'Once daily', 'Ongoing', 30, 'Oral'),
    (rx_id, 'Atorvastatin 20mg', '1 tablet at night', 'Once daily', 'Ongoing', 30, 'Oral'),
    (rx_id, 'Metoprolol 25mg', '1 tablet twice daily', 'Twice daily', '30 days', 60, 'Oral');

  -- RX 3
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (5, 5, CURRENT_DATE - 65, 'Skin rash treatment', 'Finalised')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Hydrocortisone Cream 1%', 'Apply thin layer to affected area', 'Twice daily', '2 weeks', 2, 'Topical'),
    (rx_id, 'Cetirizine 10mg', '1 tablet at night', 'Once daily at bedtime', '10 days', 10, 'Oral');

  -- RX 4
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (3, 3, CURRENT_DATE - 45, 'Post fracture pain management', 'Finalised')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Ibuprofen 400mg', '1 tablet after meals', 'Three times daily', '7 days', 21, 'Oral'),
    (rx_id, 'Calcium + Vitamin D3', '1 tablet with breakfast', 'Once daily', '3 months', 90, 'Oral');

  -- RX 5
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (14, 6, CURRENT_DATE - 20, 'Migraine prophylaxis', 'Finalised')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Propranolol 40mg', '1 tablet daily', 'Once daily', '30 days', 30, 'Oral'),
    (rx_id, 'Sumatriptan 50mg', '1 tablet at onset of migraine, may repeat after 2 hours', 'As needed', '30 days', 6, 'Oral');

  -- RX 6
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (13, 1, CURRENT_DATE - 8, 'Insulin regime post DKA', 'Finalised')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Human Insulin (Mixtard 30/70)', '14 units before breakfast, 10 units before dinner', 'Twice daily', 'Ongoing', 5, 'Subcutaneous'),
    (rx_id, 'Metformin 500mg', '1 tablet after meals', 'Twice daily', '30 days', 60, 'Oral');

  -- RX 7 (Draft)
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (11, 5, CURRENT_DATE, 'Eczema consultation prescription', 'Draft')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Tacrolimus 0.1% Ointment', 'Apply to affected skin areas', 'Twice daily', '4 weeks', 2, 'Topical');

  -- RX 8
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (7, 2, CURRENT_DATE - 17, 'Heart failure medications', 'Finalised')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Furosemide 40mg', '1 tablet in the morning', 'Once daily', '30 days', 30, 'Oral'),
    (rx_id, 'Lisinopril 5mg', '1 tablet daily', 'Once daily', '30 days', 30, 'Oral'),
    (rx_id, 'Spironolactone 25mg', '1 tablet daily', 'Once daily', '30 days', 30, 'Oral');

  -- RX 9
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (4, 4, CURRENT_DATE - 28, 'Post febrile seizure management', 'Finalised')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Syrup Paracetamol 125mg/5ml', '10ml for fever above 38°C', 'Every 6 hours as needed', '5 days', 1, 'Oral'),
    (rx_id, 'Phenobarbitone Syrup', '2ml twice daily', 'Twice daily', '6 months', 3, 'Oral');

  -- RX 10
  INSERT INTO prescriptions (patient_id, doctor_id, prescription_date, notes, status)
  VALUES (8, 1, CURRENT_DATE - 5, 'General consultation follow-up', 'Finalised')
  RETURNING prescription_id INTO rx_id;
  INSERT INTO prescription_items (prescription_id, medicine_name, dosage_instructions, frequency, duration, quantity, route)
  VALUES
    (rx_id, 'Vitamin B Complex', '1 tablet daily', 'Once daily', '30 days', 30, 'Oral');
END $$;

-- ============================================================
-- BILLS AND PAYMENTS (15+)
-- ============================================================
DO $$
DECLARE
  bill_id BIGINT;
  pay_total NUMERIC;
BEGIN
  -- Bill 1 - Ravi Kumar (PAID)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, discount_amount, tax_amount, total_amount, status)
  VALUES (1, CURRENT_DATE - 85, CURRENT_DATE - 78, 1500.00, 0, 0, 1500.00, 'Paid')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Consultation - General Medicine', 1, 500.00, 500.00),
    (bill_id, 'Medicines - Paracetamol, ORS', 1, 250.00, 250.00),
    (bill_id, 'Blood tests (CBC, Widal)', 1, 750.00, 750.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES (bill_id, 1500.00, 'UPI', 'Completed', NOW() - INTERVAL '84 days');

  -- Bill 2 - Sunita Verma (PAID)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, discount_amount, tax_amount, total_amount, status)
  VALUES (2, CURRENT_DATE - 80, CURRENT_DATE - 73, 3200.00, 200.00, 0, 3000.00, 'Paid')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Consultation - Cardiology', 1, 800.00, 800.00),
    (bill_id, 'ECG', 1, 400.00, 400.00),
    (bill_id, 'Echocardiogram', 1, 1500.00, 1500.00),
    (bill_id, 'Medicines', 1, 500.00, 500.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES (bill_id, 3000.00, 'Card', 'Completed', NOW() - INTERVAL '79 days');

  -- Bill 3 - Aditya Singh admission (PAID)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (3, CURRENT_DATE - 40, CURRENT_DATE - 33, 15500.00, 15500.00, 'Paid')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Orthopaedic Surgery', 1, 8000.00, 8000.00),
    (bill_id, 'Bed Charges (5 days - Semi-Private)', 5, 1500.00, 7500.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES (bill_id, 15500.00, 'Bank Transfer', 'Completed', NOW() - INTERVAL '39 days');

  -- Bill 4 - Lakshmi Devi (PAID)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (4, CURRENT_DATE - 28, CURRENT_DATE - 21, 2800.00, 2800.00, 'Paid')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Paediatric Consultation', 1, 600.00, 600.00),
    (bill_id, 'Bed Charges (2 days - General)', 2, 900.00, 1800.00),
    (bill_id, 'Medicines and IV fluids', 1, 400.00, 400.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES (bill_id, 2800.00, 'Cash', 'Completed', NOW() - INTERVAL '27 days');

  -- Bill 5 - Mohan Pillai - Skin (PAID)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (5, CURRENT_DATE - 65, CURRENT_DATE - 58, 950.00, 950.00, 'Paid')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Dermatology Consultation', 1, 450.00, 450.00),
    (bill_id, 'Skin patch test', 1, 300.00, 300.00),
    (bill_id, 'Topical medications', 1, 200.00, 200.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES (bill_id, 950.00, 'UPI', 'Completed', NOW() - INTERVAL '64 days');

  -- Bill 6 - Kavitha Reddy (PENDING - outstanding)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (6, CURRENT_DATE - 3, CURRENT_DATE + 7, 2000.00, 2000.00, 'Pending')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Neurology Consultation', 1, 750.00, 750.00),
    (bill_id, 'MRI Brain', 1, 1200.00, 1200.00),
    (bill_id, 'Medicines', 1, 50.00, 50.00);

  -- Bill 7 - Prakash Jain (PARTIAL)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (7, CURRENT_DATE - 17, CURRENT_DATE - 10, 14500.00, 14500.00, 'Partial')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Cardiology Consultation', 1, 800.00, 800.00),
    (bill_id, 'Bed Charges - Private (3 days)', 3, 2500.00, 7500.00),
    (bill_id, 'Echo + ECG', 1, 1900.00, 1900.00),
    (bill_id, 'Medicines', 1, 4300.00, 4300.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES
    (bill_id, 10000.00, 'Bank Transfer', 'Completed', NOW() - INTERVAL '15 days'),
    (bill_id, 2000.00, 'Cash', 'Failed', NOW() - INTERVAL '12 days');

  -- Bill 8 - Suresh Babu surgery (PENDING)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (9, CURRENT_DATE, CURRENT_DATE + 10, 22000.00, 22000.00, 'Pending')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'General Surgery Consultation', 1, 700.00, 700.00),
    (bill_id, 'Laparoscopic Appendectomy', 1, 15000.00, 15000.00),
    (bill_id, 'Bed Charges (1 day)', 1, 1000.00, 1000.00),
    (bill_id, 'Anaesthesia charges', 1, 3000.00, 3000.00),
    (bill_id, 'Pre-op investigations', 1, 2300.00, 2300.00);

  -- Bill 9 - Anitha Nair (PAID)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (10, CURRENT_DATE - 10, CURRENT_DATE - 3, 4500.00, 4500.00, 'Paid')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Gynaecology Consultation', 1, 600.00, 600.00),
    (bill_id, 'Maternity Package (Normal Delivery)', 1, 2500.00, 2500.00),
    (bill_id, 'Bed Charges (2 days)', 2, 700.00, 1400.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES (bill_id, 4500.00, 'UPI', 'Completed', NOW() - INTERVAL '9 days');

  -- Bill 10 - Ramesh Yadav (PAID)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (13, CURRENT_DATE - 6, CURRENT_DATE + 1, 6200.00, 6200.00, 'Paid')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'General Medicine Consultation', 1, 500.00, 500.00),
    (bill_id, 'Bed Charges (2 days - General)', 2, 800.00, 1600.00),
    (bill_id, 'IV Fluids and Medicines', 1, 1200.00, 1200.00),
    (bill_id, 'Blood sugar monitoring (HbA1c)', 1, 900.00, 900.00),
    (bill_id, 'Insulin and supplies', 1, 2000.00, 2000.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES (bill_id, 6200.00, 'Card', 'Completed', NOW() - INTERVAL '5 days');

  -- Bill 11 - Deepak Sharma (PENDING)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (11, CURRENT_DATE - 1, CURRENT_DATE + 9, 450.00, 450.00, 'Pending')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Dermatology Consultation', 1, 450.00, 450.00);

  -- Bill 12 - Preeti Kapoor (PAID)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (12, CURRENT_DATE - 50, CURRENT_DATE - 43, 750.00, 750.00, 'Paid')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'General Medicine Consultation', 1, 500.00, 500.00),
    (bill_id, 'Pathology - Blood panel', 1, 250.00, 250.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES (bill_id, 750.00, 'Cash', 'Completed', NOW() - INTERVAL '49 days');

  -- Bill 13 - Nisha Choudhary (PENDING)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (14, CURRENT_DATE - 20, CURRENT_DATE - 13, 1250.00, 1250.00, 'Pending')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Neurology Consultation', 1, 750.00, 750.00),
    (bill_id, 'EEG', 1, 500.00, 500.00);

  -- Bill 14 - Amit Bose (PAID)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (15, CURRENT_DATE - 40, CURRENT_DATE - 33, 700.00, 700.00, 'Paid')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'General Medicine Consultation', 1, 500.00, 500.00),
    (bill_id, 'X-Ray Chest', 1, 200.00, 200.00);
  INSERT INTO payments (bill_id, amount, payment_method, payment_status, payment_date)
  VALUES (bill_id, 700.00, 'UPI', 'Completed', NOW() - INTERVAL '39 days');

  -- Bill 15 - Sunita Verma - Current admission (PENDING)
  INSERT INTO bills (patient_id, bill_date, due_date, subtotal, total_amount, status)
  VALUES (2, CURRENT_DATE, CURRENT_DATE + 10, 37500.00, 37500.00, 'Pending')
  RETURNING bills.bill_id INTO bill_id;
  INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total) VALUES
    (bill_id, 'Cardiology Consultation', 1, 800.00, 800.00),
    (bill_id, 'Private Bed Charges (5 days)', 5, 2500.00, 12500.00),
    (bill_id, 'Coronary angiography', 1, 15000.00, 15000.00),
    (bill_id, 'Medicines and injections', 1, 5200.00, 5200.00),
    (bill_id, 'Nursing charges', 5, 800.00, 4000.00);
END $$;

-- ============================================================
-- AUDIT LOG ENTRIES (sample manual entries)
-- ============================================================
INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
VALUES
  ('patient', 1, 'INSERT', '{"patient_code":"PAT-000001","full_name":"Ravi Kumar"}'),
  ('patient', 2, 'INSERT', '{"patient_code":"PAT-000002","full_name":"Sunita Verma"}'),
  ('admission', 1, 'INSERT', '{"status":"Active","reason":"Acute chest pain"}'),
  ('appointment', 1, 'INSERT', '{"status":"Scheduled"}'),
  ('bill', 1, 'INSERT', '{"total_amount":1500}'),
  ('prescription', 1, 'INSERT', '{"status":"Finalised"}'),
  ('appointment', 1, 'STATUS_CHANGE', '{"old_status":"Scheduled","new_status":"Completed"}'),
  ('patient', 15, 'INSERT', '{"patient_code":"PAT-000015","full_name":"Amit Bose"}'),
  ('doctor', 1, 'INSERT', '{"doctor_code":"DOC-000001","full_name":"Dr. Priya Sharma"}'),
  ('admission', 4, 'DISCHARGE', '{"status":"Discharged","days":3}');

COMMIT;

SELECT 'Seed data inserted successfully!' AS result;
SELECT 'Patients: ' || COUNT(*) FROM patients;
SELECT 'Doctors: ' || COUNT(*) FROM doctors;
SELECT 'Departments: ' || COUNT(*) FROM departments;
SELECT 'Beds: ' || COUNT(*) FROM beds;
SELECT 'Appointments: ' || COUNT(*) FROM appointments;
SELECT 'Admissions: ' || COUNT(*) FROM admissions;
SELECT 'Prescriptions: ' || COUNT(*) FROM prescriptions;
SELECT 'Bills: ' || COUNT(*) FROM bills;
SELECT 'Payments: ' || COUNT(*) FROM payments;
