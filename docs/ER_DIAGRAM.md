# MediTrack — Entity Relationship (ER) Diagram & Relational Model

This document outlines the conceptual and logical database design for **MediTrack**, a Hospital Management and Patient Tracking System built for PostgreSQL.

---

## 1. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    DEPARTMENTS ||--o{ DOCTORS : "employs"
    DEPARTMENTS ||--o{ BEDS : "allocates"
    DEPARTMENTS ||--o{ APPOINTMENTS : "conducts"
    DEPARTMENTS ||--o{ ADMISSIONS : "manages"
    
    PATIENTS ||--o{ APPOINTMENTS : "books"
    PATIENTS ||--o{ ADMISSIONS : "admitted"
    PATIENTS ||--o{ PRESCRIPTIONS : "receives"
    PATIENTS ||--o{ BILLS : "billed"

    DOCTORS ||--o{ APPOINTMENTS : "attends"
    DOCTORS ||--o{ ADMISSIONS : "supervises"
    DOCTORS ||--o{ PRESCRIPTIONS : "issues"
    DOCTORS ||--o| DEPARTMENTS : "heads"

    BEDS ||--o{ ADMISSIONS : "accommodates"

    PRESCRIPTIONS ||--|{ PRESCRIPTION_ITEMS : "contains"
    APPOINTMENTS ||--o| PRESCRIPTIONS : "results_in"
    
    BILLS ||--|{ BILL_ITEMS : "contains"
    BILLS ||--o{ PAYMENTS : "settled_by"
    APPOINTMENTS ||--o| BILLS : "triggers"
    ADMISSIONS ||--o| BILLS : "invoiced_under"

    PATIENTS {
        bigint patient_id PK
        varchar patient_code UK
        varchar full_name
        date date_of_birth
        varchar gender
        varchar phone
        varchar email
        text address
        varchar blood_group
        boolean is_active
        timestamptz registered_at
    }

    DEPARTMENTS {
        bigint department_id PK
        varchar department_name UK
        text description
        varchar location
        varchar contact_number
        bigint head_doctor_id FK
        boolean is_active
        timestamptz created_at
    }

    DOCTORS {
        bigint doctor_id PK
        varchar doctor_code UK
        varchar full_name
        varchar email
        varchar phone
        bigint department_id FK
        varchar specialisation
        varchar qualification
        integer experience_years
        numeric consultation_fee
        boolean is_active
        timestamptz created_at
    }

    BEDS {
        bigint bed_id PK
        varchar bed_number
        varchar ward_name
        bigint department_id FK
        varchar bed_type
        numeric daily_charge
        varchar bed_status
        timestamptz created_at
    }

    APPOINTMENTS {
        bigint appointment_id PK
        varchar appointment_code UK
        bigint patient_id FK
        bigint doctor_id FK
        bigint department_id FK
        timestamptz appointment_start
        timestamptz appointment_end
        text reason
        varchar status
        timestamptz created_at
    }

    ADMISSIONS {
        bigint admission_id PK
        varchar admission_code UK
        bigint patient_id FK
        bigint doctor_id FK
        bigint department_id FK
        bigint bed_id FK
        timestamptz admission_datetime
        timestamptz discharge_datetime
        text admission_reason
        varchar status
        timestamptz created_at
    }

    PRESCRIPTIONS {
        bigint prescription_id PK
        varchar prescription_code UK
        bigint patient_id FK
        bigint doctor_id FK
        bigint appointment_id FK
        date prescription_date
        text notes
        varchar status
        timestamptz created_at
    }

    PRESCRIPTION_ITEMS {
        bigint prescription_item_id PK
        bigint prescription_id FK
        varchar medicine_name
        text dosage_instructions
        varchar route
        varchar frequency
        varchar duration
        integer quantity
    }

    BILLS {
        bigint bill_id PK
        varchar bill_number UK
        bigint patient_id FK
        bigint appointment_id FK
        bigint admission_id FK
        date bill_date
        date due_date
        numeric subtotal
        numeric discount_amount
        numeric tax_amount
        numeric total_amount
        varchar status
        timestamptz created_at
    }

    BILL_ITEMS {
        bigint bill_item_id PK
        bigint bill_id FK
        varchar description
        integer quantity
        numeric unit_price
        numeric line_total
    }

    PAYMENTS {
        bigint payment_id PK
        bigint bill_id FK
        numeric amount
        varchar payment_method
        varchar payment_status
        varchar transaction_reference
        timestamptz payment_date
    }

    AUDIT_LOGS {
        bigint audit_id PK
        varchar entity_type
        bigint entity_id
        varchar action_type
        jsonb old_values
        jsonb new_values
        timestamptz changed_at
    }
```

---

## 2. Cardinality & Participation Specifications

| Relationship | Cardinality | Participation | Business Explanation |
| :--- | :---: | :---: | :--- |
| **Department to Doctor** | 1 : N | Total on Doctor, Partial on Department | Every doctor must belong to 1 department. A department may employ 0, 1, or many doctors. |
| **Department to Bed** | 1 : N | Total on Bed, Partial on Department | Every hospital bed is located within a department ward. |
| **Patient to Appointment** | 1 : N | Partial on Patient | A patient may register without scheduling an immediate appointment. |
| **Doctor to Appointment** | 1 : N | Partial on Doctor | A doctor can have 0 to many consultations scheduled over time. |
| **Bed to Active Admission**| 1 : 1 (Active) | Partial on Bed | A bed can hold at most **one** active inpatient. Enforced via PostgreSQL Partial Unique Index. |
| **Prescription to Items** | 1 : N | Total on Item | A prescription consists of 1 or more line items (First Normal Form). |
| **Bill to Bill Items** | 1 : N | Total on Item | Every bill invoice is itemized into discrete service charges. |
| **Bill to Payments** | 1 : N | Partial on Bill | A bill starts with 0 payments and can receive multiple installment payments until settled. |

---

## 3. Relational Schema in Mathematical Notation

- **DEPARTMENTS** (<ins>department_id</ins>, department_name, description, location, contact_number, head_doctor_id*, is_active, created_at)
- **PATIENTS** (<ins>patient_id</ins>, patient_code, full_name, date_of_birth, gender, phone, email, address, blood_group, is_active, registered_at)
- **DOCTORS** (<ins>doctor_id</ins>, doctor_code, full_name, email, phone, department_id*, specialisation, qualification, experience_years, consultation_fee, is_active, created_at)
- **BEDS** (<ins>bed_id</ins>, bed_number, ward_name, department_id*, bed_type, daily_charge, bed_status, created_at)
- **APPOINTMENTS** (<ins>appointment_id</ins>, appointment_code, patient_id*, doctor_id*, department_id*, appointment_start, appointment_end, reason, notes, status, created_at)
- **ADMISSIONS** (<ins>admission_id</ins>, admission_code, patient_id*, doctor_id*, department_id*, bed_id*, admission_datetime, discharge_datetime, admission_reason, status, created_at)
- **PRESCRIPTIONS** (<ins>prescription_id</ins>, prescription_code, patient_id*, doctor_id*, appointment_id*, prescription_date, notes, status, created_at)
- **PRESCRIPTION_ITEMS** (<ins>prescription_item_id</ins>, prescription_id*, medicine_name, dosage_instructions, route, frequency, duration, quantity)
- **BILLS** (<ins>bill_id</ins>, bill_number, patient_id*, appointment_id*, admission_id*, bill_date, due_date, subtotal, discount_amount, tax_amount, total_amount, status, created_at)
- **BILL_ITEMS** (<ins>bill_item_id</ins>, bill_id*, description, quantity, unit_price, line_total)
- **PAYMENTS** (<ins>payment_id</ins>, bill_id*, amount, payment_method, payment_status, transaction_reference, payment_date)
- **AUDIT_LOGS** (<ins>audit_id</ins>, entity_type, entity_id, action_type, old_values, new_values, changed_at)

*(Note: Underlined attributes denote Primary Keys; asterisks `*` denote Foreign Keys).*
