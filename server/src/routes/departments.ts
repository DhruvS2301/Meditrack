import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { departmentSchema } from '../schemas';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/departments
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { is_active } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`dept.is_active = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT dept.*,
              COUNT(DISTINCT d.doctor_id) AS doctor_count,
              COUNT(DISTINCT b.bed_id) AS bed_count,
              COUNT(DISTINCT b.bed_id) FILTER (WHERE b.bed_status = 'Available') AS available_beds,
              hd.full_name AS head_doctor_name
       FROM departments dept
       LEFT JOIN doctors d ON d.department_id = dept.department_id AND d.is_active = true
       LEFT JOIN beds b ON b.department_id = dept.department_id
       LEFT JOIN doctors hd ON dept.head_doctor_id = hd.doctor_id
       ${where}
       GROUP BY dept.department_id, hd.full_name
       ORDER BY dept.department_name`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/departments/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT dept.*, hd.full_name AS head_doctor_name
       FROM departments dept
       LEFT JOIN doctors hd ON dept.head_doctor_id = hd.doctor_id
       WHERE dept.department_id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) throw new AppError(404, 'Department not found');

    const doctors = await pool.query(
      `SELECT doctor_id, doctor_code, full_name, specialisation, is_active
       FROM doctors WHERE department_id = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...result.rows[0], doctors: doctors.rows } });
  } catch (err) {
    next(err);
  }
});

// POST /api/departments
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = departmentSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO departments (department_name, description, location, contact_number, head_doctor_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [data.department_name, data.description, data.location, data.contact_number, data.head_doctor_id]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
       VALUES ('department', $1, 'INSERT', $2)`,
      [result.rows[0].department_id, JSON.stringify(result.rows[0])]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/departments/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = departmentSchema.partial().parse(req.body);
    const existing = await pool.query('SELECT * FROM departments WHERE department_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Department not found');

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) throw new AppError(400, 'No fields to update');
    const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = fields.map(([, v]) => v);

    const result = await pool.query(
      `UPDATE departments SET ${sets} WHERE department_id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/departments/:id/deactivate
router.patch('/:id/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query('SELECT * FROM departments WHERE department_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Department not found');

    const activeAdmissions = await pool.query(
      `SELECT admission_id FROM admissions WHERE department_id = $1 AND status = 'Active'`,
      [req.params.id]
    );
    if (activeAdmissions.rows.length) {
      throw new AppError(409, 'Cannot deactivate a department with active admissions');
    }

    const result = await pool.query(
      `UPDATE departments SET is_active = false WHERE department_id = $1 RETURNING *`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('department', $1, 'DEACTIVATE', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/departments/:id/activate
router.patch('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query('SELECT * FROM departments WHERE department_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Department not found');

    const result = await pool.query(
      `UPDATE departments SET is_active = true WHERE department_id = $1 RETURNING *`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('department', $1, 'ACTIVATE', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/departments/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query('SELECT * FROM departments WHERE department_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Department not found');

    // Check relationships: doctors, beds, appointments, admissions
    const relationCheck = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM doctors WHERE department_id = $1) AS doc_count,
         (SELECT COUNT(*) FROM beds WHERE department_id = $1) AS bed_count,
         (SELECT COUNT(*) FROM appointments WHERE department_id = $1) AS appt_count,
         (SELECT COUNT(*) FROM admissions WHERE department_id = $1) AS adm_count`,
      [req.params.id]
    );

    const { doc_count, bed_count, appt_count, adm_count } = relationCheck.rows[0];
    const totalRelations = parseInt(doc_count) + parseInt(bed_count) + parseInt(appt_count) + parseInt(adm_count);

    if (totalRelations > 0) {
      throw new AppError(
        409,
        `Cannot delete department '${existing.rows[0].department_name}' because it has assigned resources ` +
        `(${doc_count} doctors, ${bed_count} beds, ${appt_count} appointments, ${adm_count} admissions). ` +
        `Please reassign or delete these records first, or deactivate the department.`
      );
    }

    const result = await pool.query(
      'DELETE FROM departments WHERE department_id = $1 RETURNING *',
      [req.params.id]
    );

    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values)
       VALUES ('department', $1, 'DELETE', $2)`,
      [req.params.id, JSON.stringify(existing.rows[0])]
    );

    res.json({ success: true, message: 'Department permanently deleted', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
