# MediTrack — Examiner & DBMS Viva Demonstration Guide

This guide prepares students to conduct a live demonstration of MediTrack and explain the underlying Database Management Systems (DBMS) concepts to an academic examiner using **pgAdmin 4** alongside the web UI.

---

## 1. Walkthrough Roadmap for the Examiner

| Phase | Duration | Topic | Demonstration Action |
| :--- | :---: | :--- | :--- |
| **Phase 1** | 2 mins | System Architecture & ER Diagram | Present `docs/ER_DIAGRAM.md`, explain 3NF relational design. |
| **Phase 2** | 3 mins | Live Frontend Operations | Register patient, book consultation, admit patient to bed. |
| **Phase 3** | 4 mins | Live pgAdmin 4 Inspection | Query `audit_logs`, check bed status change, inspect constraints. |
| **Phase 4** | 3 mins | Conflict & Integrity Enforcement | Trigger appointment overlap conflict (409) and double bed allocation. |
| **Phase 5** | 3 mins | Complex SQL Demonstrations | Run Join, Correlated Subquery, and Aggregate scripts in pgAdmin 4. |

---

## 2. Five Key DBMS Concepts to Demonstrate Live

### Demonstration 1: Entity & Referential Integrity (Constraints)
- **Concept**: Primary Keys, Foreign Keys, `NOT NULL`, `CHECK`, and `UNIQUE`.
- **In pgAdmin 4**: Expand `Tables -> patients -> Constraints`.
- **Show Examiner**:
  - `chk_patient_gender`: Restricts gender to allowed domains.
  - `chk_patient_dob_not_future`: Prevents future date of birth.
  - Foreign key `fk_dept_head_doctor` references `doctors(doctor_id)`.
  - Notice `ON DELETE RESTRICT` on `patients` and `doctors`: Explain that attempting to delete a doctor who has historical prescriptions will be blocked by the DBMS to preserve medical history.

### Demonstration 2: GiST Exclusion Constraint (Anti-Double-Booking)
- **Concept**: Advanced PostgreSQL Exclusion Constraints using `btree_gist`.
- **In UI**:
  1. Note an active doctor's appointment time (e.g. Dr. Priya Sharma at 10:00 AM - 10:30 AM).
  2. Try to schedule another patient with Dr. Priya Sharma at 10:15 AM - 10:45 AM.
  3. The system returns an immediate `409 Conflict`: *"Doctor has a conflicting appointment at this time"*.
- **In pgAdmin 4**: Show the index:
  ```sql
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'appointments';
  ```
  Highlight `idx_appt_doctor_overlap USING GIST (doctor_id, tstzrange(appointment_start, appointment_end))`.

### Demonstration 3: Inpatient Admission ACID Transaction & Bed Locking
- **Concept**: Multi-table atomic transactions with `BEGIN`, `COMMIT`, `FOR UPDATE`, and `ROLLBACK`.
- **In UI**: Go to **Admissions & Beds**. Note Bed `GM-1` is `Available`. Admit patient `Ravi Kumar`.
- **In pgAdmin 4**: Run:
  ```sql
  SELECT bed_number, bed_status FROM beds WHERE bed_number = 'GM-1';
  SELECT * FROM admissions WHERE status = 'Active' AND bed_id = (SELECT bed_id FROM beds WHERE bed_number = 'GM-1');
  ```
  Explain: The backend used a checked-out transaction client to lock the bed row (`FOR UPDATE`), insert the admission record, update the bed status, and log the audit trail in a single committed atomic transaction.

### Demonstration 4: Partial Unique Index
- **Concept**: Indexing a subset of table rows using a `WHERE` predicate.
- **In pgAdmin 4**:
  ```sql
  SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'idx_one_active_admission_per_bed';
  ```
  Explain to examiner: A bed can have many historical discharged admissions over the years, but can hold at most **ONE** active admission (`WHERE status = 'Active'`). A normal unique index would prohibit multiple discharged records, but a partial unique index enforces the exact business rule.

### Demonstration 5: Complex Join & Correlated Subqueries
- **Concept**: Multi-table relational queries and uncorrelated vs correlated subqueries.
- **In pgAdmin 4**: Open `database/sql-examples/07_join_queries.sql` and run query #3:
  ```sql
  SELECT adm.admission_code, p.full_name, d.full_name AS doctor, dept.department_name, b.bed_number
  FROM admissions adm
  JOIN patients p ON adm.patient_id = p.patient_id
  JOIN doctors d ON adm.doctor_id = d.doctor_id
  JOIN departments dept ON adm.department_id = dept.department_id
  JOIN beds b ON adm.bed_id = b.bed_id
  WHERE adm.status = 'Active';
  ```
  Then run `database/sql-examples/08_nested_subqueries.sql` query #2 (`NOT EXISTS`) to demonstrate correlated evaluation.

---

## 3. Frequently Asked Viva Questions & Model Answers

1. **Q: Why use `BIGINT GENERATED ALWAYS AS IDENTITY` instead of `SERIAL`?**
   *A:* `IDENTITY` is the SQL standard conforming implementation in modern PostgreSQL (PostgreSQL 10+), preventing manual or accidental overrides of sequence numbers.

2. **Q: Why are monetary amounts defined as `NUMERIC(12,2)` instead of `FLOAT` or `REAL`?**
   *A:* Floating-point numbers use binary floating-point representation (IEEE 754), which causes binary rounding discrepancies in decimal currency addition (e.g. $0.1 + 0.2 \neq 0.3$). `NUMERIC` stores exact decimal values.

3. **Q: How does the application prevent SQL Injection?**
   *A:* Every SQL query sent via `node-postgres` uses parameterised queries (`$1, $2, $3`), where input values are sent separately to PostgreSQL as parameters and never concatenated directly into the SQL string.

4. **Q: What is the purpose of the `audit_logs` table having a polymorphic `entity_id`?**
   *A:* Instead of creating 8 separate audit tables for patients, doctors, admissions, and bills, a polymorphic audit table captures change history across all entities using `entity_type`, `entity_id`, and `old_values` / `new_values` stored as native PostgreSQL `JSONB`.
