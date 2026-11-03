import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { patientSchema, paginationSchema } from '../schemas';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/patients
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, sort_by, sort_order } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const allowedSort: Record<string, string> = {
      full_name: 'p.full_name',
      registered_at: 'p.registered_at',
      patient_code: 'p.patient_code',
    };
    const sortCol = allowedSort[sort_by || 'registered_at'] || 'p.registered_at';
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = ['p.is_active = true'];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.full_name ILIKE $${params.length} OR p.patient_code ILIKE $${params.length} OR p.phone ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM patients p ${where}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT p.patient_id, p.patient_code, p.full_name, p.date_of_birth, p.gender,
              p.phone, p.email, p.blood_group, p.registered_at, p.is_active,
              EXTRACT(YEAR FROM AGE(p.date_of_birth)) AS age
       FROM patients p ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);
    res.json({
      success: true,
      data: dataResult.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT p.*, EXTRACT(YEAR FROM AGE(p.date_of_birth)) AS age
       FROM patients p WHERE p.patient_id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) throw new AppError(404, 'Patient not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = patientSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO patients (full_name, date_of_birth, gender, phone, email, address,
         emergency_contact_name, emergency_contact_phone, blood_group)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [data.full_name, data.date_of_birth, data.gender, data.phone, data.email,
       data.address, data.emergency_contact_name, data.emergency_contact_phone, data.blood_group]
    );
    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
       VALUES ('patient', $1, 'INSERT', $2)`,
      [result.rows[0].patient_id, JSON.stringify(result.rows[0])]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/patients/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = patientSchema.partial().parse(req.body);
    const existing = await pool.query('SELECT * FROM patients WHERE patient_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Patient not found');

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) throw new AppError(400, 'No fields to update');

    const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = fields.map(([, v]) => v);

    const result = await pool.query(
      `UPDATE patients SET ${sets}, updated_at = NOW() WHERE patient_id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('patient', $1, 'UPDATE', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/patients/:id/deactivate
router.patch('/:id/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await pool.query(
      'SELECT * FROM patients WHERE patient_id = $1',
      [req.params.id]
    );
    if (!patient.rows.length) throw new AppError(404, 'Patient not found');

    const activeAdmission = await pool.query(
      `SELECT admission_id FROM admissions WHERE patient_id = $1 AND status = 'Active'`,
      [req.params.id]
    );
    if (activeAdmission.rows.length) {
      throw new AppError(409, 'Cannot deactivate a patient with an active admission');
    }

    const result = await pool.query(
      `UPDATE patients SET is_active = false, updated_at = NOW() WHERE patient_id = $1 RETURNING *`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('patient', $1, 'DEACTIVATE', $2, $3)`,
      [req.params.id, JSON.stringify(patient.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/patients/:id/activate
router.patch('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await pool.query(
      'SELECT * FROM patients WHERE patient_id = $1',
      [req.params.id]
    );
    if (!patient.rows.length) throw new AppError(404, 'Patient not found');

    const result = await pool.query(
      `UPDATE patients SET is_active = true, updated_at = NOW() WHERE patient_id = $1 RETURNING *`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('patient', $1, 'ACTIVATE', $2, $3)`,
      [req.params.id, JSON.stringify(patient.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/patients/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await pool.query(
      'SELECT * FROM patients WHERE patient_id = $1',
      [req.params.id]
    );
    if (!patient.rows.length) throw new AppError(404, 'Patient not found');

    // Check all foreign relationships
    const relationCheck = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM appointments WHERE patient_id = $1) AS appt_count,
         (SELECT COUNT(*) FROM admissions WHERE patient_id = $1) AS adm_count,
         (SELECT COUNT(*) FROM prescriptions WHERE patient_id = $1) AS rx_count,
         (SELECT COUNT(*) FROM bills WHERE patient_id = $1) AS bill_count`,
      [req.params.id]
    );

    const { appt_count, adm_count, rx_count, bill_count } = relationCheck.rows[0];
    const totalRelations = parseInt(appt_count) + parseInt(adm_count) + parseInt(rx_count) + parseInt(bill_count);

    if (totalRelations > 0) {
      throw new AppError(
        409,
        `Cannot permanently delete patient '${patient.rows[0].full_name}' because they have linked historical records ` +
        `(${appt_count} appointments, ${adm_count} admissions, ${rx_count} prescriptions, ${bill_count} bills). ` +
        `To preserve clinical and financial audit integrity, please deactivate this patient instead.`
      );
    }

    const result = await pool.query(
      `DELETE FROM patients WHERE patient_id = $1 RETURNING *`,
      [req.params.id]
    );

    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values)
       VALUES ('patient', $1, 'DELETE', $2)`,
      [req.params.id, JSON.stringify(patient.rows[0])]
    );

    res.json({ success: true, message: 'Patient permanently deleted', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id/appointments
router.get('/:id/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT a.*, d.full_name AS doctor_name, dept.department_name
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN departments dept ON a.department_id = dept.department_id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_start DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id/admissions
router.get('/:id/admissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT adm.*, d.full_name AS doctor_name, dept.department_name, b.bed_number, b.ward_name
       FROM admissions adm
       JOIN doctors d ON adm.doctor_id = d.doctor_id
       JOIN departments dept ON adm.department_id = dept.department_id
       JOIN beds b ON adm.bed_id = b.bed_id
       WHERE adm.patient_id = $1
       ORDER BY adm.admission_datetime DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id/prescriptions
router.get('/:id/prescriptions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, d.full_name AS doctor_name
       FROM prescriptions pr
       JOIN doctors d ON pr.doctor_id = d.doctor_id
       WHERE pr.patient_id = $1
       ORDER BY pr.prescription_date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id/bills
router.get('/:id/bills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT b.*,
              COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'Completed'), 0) AS amount_paid,
              b.total_amount - COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'Completed'), 0) AS outstanding
       FROM bills b
       LEFT JOIN payments p ON b.bill_id = p.bill_id
       WHERE b.patient_id = $1
       GROUP BY b.bill_id
       ORDER BY b.bill_date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
