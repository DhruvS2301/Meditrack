import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { doctorSchema, paginationSchema } from '../schemas';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/doctors
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, sort_by, sort_order } = paginationSchema.parse(req.query);
    const { department_id, specialisation, is_active } = req.query;
    const offset = (page - 1) * limit;

    const allowedSort: Record<string, string> = {
      full_name: 'd.full_name',
      created_at: 'd.created_at',
      experience_years: 'd.experience_years',
    };
    const sortCol = allowedSort[sort_by || 'full_name'] || 'd.full_name';
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(d.full_name ILIKE $${params.length} OR d.doctor_code ILIKE $${params.length} OR d.specialisation ILIKE $${params.length})`);
    }
    if (department_id) {
      params.push(department_id);
      conditions.push(`d.department_id = $${params.length}`);
    }
    if (specialisation) {
      params.push(`%${specialisation}%`);
      conditions.push(`d.specialisation ILIKE $${params.length}`);
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`d.is_active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM doctors d ${where}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT d.*, dept.department_name,
              COUNT(a.appointment_id) FILTER (WHERE a.appointment_start > NOW() AND a.status NOT IN ('Cancelled', 'No Show')) AS upcoming_appointments
       FROM doctors d
       LEFT JOIN departments dept ON d.department_id = dept.department_id
       LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
       ${where}
       GROUP BY d.doctor_id, dept.department_name
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

// GET /api/doctors/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT d.*, dept.department_name
       FROM doctors d
       LEFT JOIN departments dept ON d.department_id = dept.department_id
       WHERE d.doctor_id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) throw new AppError(404, 'Doctor not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/doctors
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = doctorSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO doctors (full_name, email, phone, department_id, specialisation, qualification, experience_years, consultation_fee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [data.full_name, data.email, data.phone, data.department_id, data.specialisation,
       data.qualification, data.experience_years, data.consultation_fee]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
       VALUES ('doctor', $1, 'INSERT', $2)`,
      [result.rows[0].doctor_id, JSON.stringify(result.rows[0])]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/doctors/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = doctorSchema.partial().parse(req.body);
    const existing = await pool.query('SELECT * FROM doctors WHERE doctor_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Doctor not found');

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) throw new AppError(400, 'No fields to update');
    const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = fields.map(([, v]) => v);

    const result = await pool.query(
      `UPDATE doctors SET ${sets}, updated_at = NOW() WHERE doctor_id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('doctor', $1, 'UPDATE', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/doctors/:id/deactivate
router.patch('/:id/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query('SELECT * FROM doctors WHERE doctor_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Doctor not found');

    const activeAdmissions = await pool.query(
      `SELECT admission_id FROM admissions WHERE doctor_id = $1 AND status = 'Active'`,
      [req.params.id]
    );
    if (activeAdmissions.rows.length) {
      throw new AppError(409, 'Cannot deactivate a doctor with active patient admissions');
    }

    const result = await pool.query(
      `UPDATE doctors SET is_active = false, updated_at = NOW() WHERE doctor_id = $1 RETURNING *`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('doctor', $1, 'DEACTIVATE', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/doctors/:id/activate
router.patch('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query('SELECT * FROM doctors WHERE doctor_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Doctor not found');

    const result = await pool.query(
      `UPDATE doctors SET is_active = true, updated_at = NOW() WHERE doctor_id = $1 RETURNING *`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('doctor', $1, 'ACTIVATE', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/doctors/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query('SELECT * FROM doctors WHERE doctor_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Doctor not found');

    // Check if doctor is head of any department
    const headCheck = await pool.query('SELECT department_name FROM departments WHERE head_doctor_id = $1', [req.params.id]);
    if (headCheck.rows.length) {
      throw new AppError(409, `Cannot delete doctor who is head of department '${headCheck.rows[0].department_name}'. Please reassign department head first.`);
    }

    // Check relationships: appointments, admissions, prescriptions
    const relationCheck = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1) AS appt_count,
         (SELECT COUNT(*) FROM admissions WHERE doctor_id = $1) AS adm_count,
         (SELECT COUNT(*) FROM prescriptions WHERE doctor_id = $1) AS rx_count`,
      [req.params.id]
    );

    const { appt_count, adm_count, rx_count } = relationCheck.rows[0];
    const totalRelations = parseInt(appt_count) + parseInt(adm_count) + parseInt(rx_count);

    if (totalRelations > 0) {
      throw new AppError(
        409,
        `Cannot permanently delete Dr. ${existing.rows[0].full_name} because they have linked clinical records ` +
        `(${appt_count} appointments, ${adm_count} admissions, ${rx_count} prescriptions). ` +
        `To maintain historical medical records, please deactivate this doctor instead.`
      );
    }

    const result = await pool.query(
      'DELETE FROM doctors WHERE doctor_id = $1 RETURNING *',
      [req.params.id]
    );

    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values)
       VALUES ('doctor', $1, 'DELETE', $2)`,
      [req.params.id, JSON.stringify(existing.rows[0])]
    );

    res.json({ success: true, message: 'Doctor permanently deleted', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/:id/appointments
router.get('/:id/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.patient_code, dept.department_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN departments dept ON a.department_id = dept.department_id
       WHERE a.doctor_id = $1
       ORDER BY a.appointment_start DESC
       LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/:id/availability
router.get('/:id/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query;
    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT a.appointment_start, a.appointment_end, a.status,
              p.full_name AS patient_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.doctor_id = $1
         AND DATE(a.appointment_start) = $2
         AND a.status NOT IN ('Cancelled', 'No Show')
       ORDER BY a.appointment_start`,
      [req.params.id, targetDate]
    );
    res.json({ success: true, data: result.rows, date: targetDate });
  } catch (err) {
    next(err);
  }
});

export default router;
