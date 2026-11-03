import { z } from 'zod';

export const patientSchema = z.object({
  full_name: z.string().min(2).max(100),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional().nullable(),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  emergency_contact_name: z.string().max(100).optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().nullable(),
});

export const departmentSchema = z.object({
  department_name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  contact_number: z.string().max(20).optional().nullable(),
  head_doctor_id: z.number().int().positive().optional().nullable(),
});

export const doctorSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(7).max(20),
  department_id: z.number().int().positive(),
  specialisation: z.string().max(100),
  qualification: z.string().max(200).optional().nullable(),
  experience_years: z.number().int().min(0).max(60).optional().nullable(),
  consultation_fee: z.number().min(0).max(999999.99),
});

export const appointmentSchema = z.object({
  patient_id: z.number().int().positive(),
  doctor_id: z.number().int().positive(),
  department_id: z.number().int().positive(),
  appointment_start: z.string().datetime({ offset: true }).or(z.string().min(1)),
  appointment_end: z.string().datetime({ offset: true }).or(z.string().min(1)),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum([
    'Scheduled', 'Confirmed', 'Checked In', 'In Progress',
    'Completed', 'Cancelled', 'No Show'
  ]).optional(),
});

export const appointmentStatusSchema = z.object({
  status: z.enum([
    'Scheduled', 'Confirmed', 'Checked In', 'In Progress',
    'Completed', 'Cancelled', 'No Show'
  ]),
});

export const bedSchema = z.object({
  bed_number: z.string().min(1).max(20),
  ward_name: z.string().min(1).max(100),
  department_id: z.number().int().positive(),
  bed_type: z.enum(['General', 'Semi-Private', 'Private', 'ICU']),
  daily_charge: z.number().min(0).max(999999.99),
});

export const admissionSchema = z.object({
  patient_id: z.number().int().positive(),
  doctor_id: z.number().int().positive(),
  department_id: z.number().int().positive(),
  bed_id: z.number().int().positive(),
  admission_datetime: z.string().min(1),
  admission_reason: z.string().min(2).max(1000),
  initial_notes: z.string().max(2000).optional().nullable(),
  expected_discharge_date: z.string().optional().nullable(),
});

export const dischargeSchema = z.object({
  discharge_datetime: z.string().min(1),
  discharge_notes: z.string().max(2000).optional().nullable(),
});

export const prescriptionSchema = z.object({
  patient_id: z.number().int().positive(),
  doctor_id: z.number().int().positive(),
  appointment_id: z.number().int().positive().optional().nullable(),
  prescription_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(z.object({
    medicine_name: z.string().min(1).max(200),
    dosage_instructions: z.string().min(1).max(500),
    route: z.string().max(100).optional().nullable(),
    frequency: z.string().min(1).max(100),
    duration: z.string().min(1).max(100),
    quantity: z.number().int().positive(),
    additional_instructions: z.string().max(500).optional().nullable(),
  })).min(1),
});

export const billSchema = z.object({
  patient_id: z.number().int().positive(),
  appointment_id: z.number().int().positive().optional().nullable(),
  admission_id: z.number().int().positive().optional().nullable(),
  bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  discount_amount: z.number().min(0).optional().default(0),
  tax_amount: z.number().min(0).optional().default(0),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1).max(300),
    quantity: z.number().int().positive(),
    unit_price: z.number().min(0),
  })).min(1),
});

export const paymentSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.enum(['Cash', 'Card', 'UPI', 'Bank Transfer']),
  payment_date: z.string().min(1),
  transaction_reference: z.string().max(100).optional().nullable(),
  payment_status: z.enum(['Pending', 'Completed', 'Failed', 'Refunded']).optional().default('Completed'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(20),
  search: z.string().max(200).optional(),
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});
