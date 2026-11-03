-- ============================================================
-- 11_transactions_and_concurrency.sql
-- MediTrack: ACID Transactions, Rollbacks & Row-Level Locking
-- ============================================================

-- ============================================================
-- DEMONSTRATION 1: Successful Multi-Step Inpatient Admission
-- Both admission creation and bed status update occur atomically.
-- ============================================================
BEGIN;

-- Step 1: Explicitly lock the candidate bed row to prevent race conditions.
-- Concurrent transactions trying to read this bed 'FOR UPDATE' will wait.
SELECT bed_id, bed_number, bed_status
FROM beds
WHERE bed_id = 1
FOR UPDATE;

-- Step 2: Insert the new admission record
INSERT INTO admissions (
  patient_id, doctor_id, department_id, bed_id, admission_datetime, admission_reason, status
) VALUES (
  1, 1, 1, 1, NOW(), 'ACID Transaction Test - Fever Admission', 'Active'
);

-- Step 3: Update bed availability to Occupied
UPDATE beds
SET bed_status = 'Occupied'
WHERE bed_id = 1;

-- Step 4: Record audit history
INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
VALUES ('admission', 1, 'TRANSACTION_TEST', '{"status":"Active","bed_id":1}'::jsonb);

-- Commit all changes together
COMMIT;


-- ============================================================
-- DEMONSTRATION 2: Transaction ROLLBACK (Simulated Error)
-- Demonstrates how failed business logic completely rolls back.
-- ============================================================
BEGIN;

-- Attempt to insert a bill
INSERT INTO bills (patient_id, bill_date, subtotal, total_amount, status)
VALUES (1, CURRENT_DATE, 5000.00, 5000.00, 'Pending');

-- Insert line items
INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total)
VALUES ((SELECT MAX(bill_id) FROM bills), 'Laboratory Panels', 1, 5000.00, 5000.00);

-- Simulated Failure: Something goes wrong during billing calculation!
-- Force rollback to ensure no partial bill or line item remains in database:
ROLLBACK;

-- Verify that no orphan bill was committed:
SELECT * FROM bills WHERE total_amount = 5000.00 AND bill_date = CURRENT_DATE;


-- ============================================================
-- DEMONSTRATION 3: SAVEPOINT & Partial Rollback
-- ============================================================
BEGIN;

-- Insert patient
INSERT INTO patients (full_name, phone)
VALUES ('Savepoint Demo Patient', '9991112223');

-- Set savepoint
SAVEPOINT patient_created;

-- Try an invalid operation that violates a check constraint
-- (e.g. consultation_fee < 0)
-- If this was attempted in a sub-procedure, we can roll back to savepoint:
ROLLBACK TO SAVEPOINT patient_created;

-- Safely commit the outer patient record
COMMIT;

-- Clean up demonstration record
DELETE FROM patients WHERE phone = '9991112223';
