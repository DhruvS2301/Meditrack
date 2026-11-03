import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { bedSchema, admissionSchema, dischargeSchema, paginationSchema } from '../schemas';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/beds
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { department_id, bed_status, bed_type } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (department_id) {
      params.push(department_id);
      conditions.push(`b.department_id = $${params.length}`);
    }
    if (bed_status) {
      params.push(bed_status);
      conditions.push(`b.bed_status = $${params.length}`);
    }
    if (bed_type) {
      params.push(bed_type);
      conditions.push(`b.bed_type = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT b.*, dept.department_name,
              adm.admission_id, adm.admission_code,
              pat.full_name AS patient_name
       FROM beds b
       LEFT JOIN departments dept ON b.department_id = dept.department_id
       LEFT JOIN admissions adm ON adm.bed_id = b.bed_id AND adm.status = 'Active'
       LEFT JOIN patients pat ON adm.patient_id = pat.patient_id
       ${where}
       ORDER BY b.ward_name, b.bed_number`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/beds/availability
router.get('/availability', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT
         dept.department_name,
         b.ward_name,
         b.bed_type,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE b.bed_status = 'Available') AS available,
         COUNT(*) FILTER (WHERE b.bed_status = 'Occupied') AS occupied,
         COUNT(*) FILTER (WHERE b.bed_status = 'Maintenance') AS maintenance
       FROM beds b
       JOIN departments dept ON b.department_id = dept.department_id
       GROUP BY dept.department_name, b.ward_name, b.bed_type
       ORDER BY dept.department_name, b.ward_name, b.bed_type`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/beds
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = bedSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO beds (bed_number, ward_name, department_id, bed_type, daily_charge)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [data.bed_number, data.ward_name, data.department_id, data.bed_type, data.daily_charge]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/beds/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = bedSchema.partial().parse(req.body);
    const existing = await pool.query('SELECT * FROM beds WHERE bed_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Bed not found');

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) throw new AppError(400, 'No fields to update');
    const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = fields.map(([, v]) => v);

    const result = await pool.query(
      `UPDATE beds SET ${sets} WHERE bed_id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('bed', $1, 'UPDATE', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/beds/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT b.*, dept.department_name,
              adm.admission_id, adm.admission_code,
              pat.full_name AS patient_name
       FROM beds b
       LEFT JOIN departments dept ON b.department_id = dept.department_id
       LEFT JOIN admissions adm ON adm.bed_id = b.bed_id AND adm.status = 'Active'
       LEFT JOIN patients pat ON adm.patient_id = pat.patient_id
       WHERE b.bed_id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) throw new AppError(404, 'Bed not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/beds/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query('SELECT * FROM beds WHERE bed_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Bed not found');

    const activeCheck = await pool.query(
      `SELECT admission_id FROM admissions WHERE bed_id = $1 AND status = 'Active'`,
      [req.params.id]
    );
    if (activeCheck.rows.length) {
      throw new AppError(409, `Cannot delete bed ${existing.rows[0].bed_number} because a patient is currently admitted to it.`);
    }

    const historyCheck = await pool.query(
      `SELECT COUNT(*) FROM admissions WHERE bed_id = $1`,
      [req.params.id]
    );
    if (parseInt(historyCheck.rows[0].count) > 0) {
      throw new AppError(
        409,
        `Cannot permanently delete bed ${existing.rows[0].bed_number} because it has historical inpatient admission records. ` +
        `To take it out of circulation, please update its status to 'Maintenance' instead.`
      );
    }

    const result = await pool.query('DELETE FROM beds WHERE bed_id = $1 RETURNING *', [req.params.id]);
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values)
       VALUES ('bed', $1, 'DELETE', $2)`,
      [req.params.id, JSON.stringify(existing.rows[0])]
    );

    res.json({ success: true, message: 'Bed deleted successfully', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

const admissionsRouter = Router();

admissionsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort_order } = paginationSchema.parse(req.query);
    const { status, department_id } = req.query;
    const offset = (page - 1) * limit;
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      params.push(status);
      conditions.push(`adm.status = $${params.length}`);
    }
    if (department_id) {
      params.push(department_id);
      conditions.push(`adm.department_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await pool.query(`SELECT COUNT(*) FROM admissions adm ${where}`, params);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT adm.*,
              p.full_name AS patient_name, p.patient_code,
              d.full_name AS doctor_name,
              dept.department_name,
              b.bed_number, b.ward_name,
              CASE WHEN adm.discharge_datetime IS NOT NULL
                   THEN ROUND(EXTRACT(EPOCH FROM adm.discharge_datetime - adm.admission_datetime)/86400, 1)
                   ELSE ROUND(EXTRACT(EPOCH FROM NOW() - adm.admission_datetime)/86400, 1)
              END AS days_admitted
       FROM admissions adm
       JOIN patients p ON adm.patient_id = p.patient_id
       JOIN doctors d ON adm.doctor_id = d.doctor_id
       JOIN departments dept ON adm.department_id = dept.department_id
       JOIN beds b ON adm.bed_id = b.bed_id
       ${where}
       ORDER BY adm.admission_datetime ${sortDir}
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

admissionsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT adm.*,
              p.full_name AS patient_name, p.patient_code, p.phone AS patient_phone,
              d.full_name AS doctor_name, d.specialisation,
              dept.department_name,
              b.bed_number, b.ward_name, b.bed_type, b.daily_charge,
              CASE WHEN adm.discharge_datetime IS NOT NULL
                   THEN ROUND(EXTRACT(EPOCH FROM adm.discharge_datetime - adm.admission_datetime)/86400, 1)
                   ELSE ROUND(EXTRACT(EPOCH FROM NOW() - adm.admission_datetime)/86400, 1)
              END AS days_admitted
       FROM admissions adm
       JOIN patients p ON adm.patient_id = p.patient_id
       JOIN doctors d ON adm.doctor_id = d.doctor_id
       JOIN departments dept ON adm.department_id = dept.department_id
       JOIN beds b ON adm.bed_id = b.bed_id
       WHERE adm.admission_id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) throw new AppError(404, 'Admission not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

admissionsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const data = admissionSchema.parse(req.body);
    await client.query('BEGIN');

    // Validate doctor is active
    const doctor = await client.query('SELECT is_active FROM doctors WHERE doctor_id = $1', [data.doctor_id]);
    if (!doctor.rows.length) throw new AppError(404, 'Doctor not found');
    if (!doctor.rows[0].is_active) throw new AppError(409, 'Doctor is not active');

    // Validate patient - no active admission
    const existingAdmission = await client.query(
      `SELECT admission_id FROM admissions WHERE patient_id = $1 AND status = 'Active'`,
      [data.patient_id]
    );
    if (existingAdmission.rows.length) {
      throw new AppError(409, 'Patient already has an active admission');
    }

    // Lock and check bed
    const bed = await client.query(
      'SELECT bed_id, bed_status FROM beds WHERE bed_id = $1 FOR UPDATE',
      [data.bed_id]
    );
    if (!bed.rows.length) throw new AppError(404, 'Bed not found');
    if (bed.rows[0].bed_status !== 'Available') {
      throw new AppError(409, `Bed is not available (current status: ${bed.rows[0].bed_status})`);
    }

    // Create admission
    const admission = await client.query(
      `INSERT INTO admissions
         (patient_id, doctor_id, department_id, bed_id, admission_datetime,
          admission_reason, initial_notes, expected_discharge_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [data.patient_id, data.doctor_id, data.department_id, data.bed_id,
       data.admission_datetime, data.admission_reason, data.initial_notes,
       data.expected_discharge_date]
    );

    // Mark bed as occupied
    await client.query(
      `UPDATE beds SET bed_status = 'Occupied' WHERE bed_id = $1`,
      [data.bed_id]
    );

    // Audit
    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
       VALUES ('admission', $1, 'INSERT', $2)`,
      [admission.rows[0].admission_id, JSON.stringify(admission.rows[0])]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: admission.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

admissionsRouter.post('/:id/discharge', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const data = dischargeSchema.parse(req.body);
    await client.query('BEGIN');

    const admission = await client.query(
      `SELECT adm.*, b.bed_id FROM admissions adm JOIN beds b ON adm.bed_id = b.bed_id WHERE adm.admission_id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!admission.rows.length) throw new AppError(404, 'Admission not found');
    if (admission.rows[0].status !== 'Active') {
      throw new AppError(409, 'Admission is not active');
    }

    const dischargeTime = new Date(data.discharge_datetime);
    const admissionTime = new Date(admission.rows[0].admission_datetime);
    if (dischargeTime <= admissionTime) {
      throw new AppError(400, 'Discharge time must be after admission time');
    }

    const result = await client.query(
      `UPDATE admissions SET
         discharge_datetime = $2,
         discharge_notes = $3,
         status = 'Discharged',
         updated_at = NOW()
       WHERE admission_id = $1
       RETURNING *`,
      [req.params.id, data.discharge_datetime, data.discharge_notes]
    );

    await client.query(
      `UPDATE beds SET bed_status = 'Available' WHERE bed_id = $1`,
      [admission.rows[0].bed_id]
    );

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('admission', $1, 'DISCHARGE', $2, $3)`,
      [req.params.id, JSON.stringify(admission.rows[0]), JSON.stringify(result.rows[0])]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PATCH /api/admissions/:id (Update admission details)
admissionsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query('SELECT * FROM admissions WHERE admission_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Admission not found');

    const { admission_reason, initial_notes, expected_discharge_date } = req.body;
    const fields: string[] = [];
    const values: unknown[] = [req.params.id];

    if (admission_reason !== undefined) {
      values.push(admission_reason);
      fields.push(`admission_reason = $${values.length}`);
    }
    if (initial_notes !== undefined) {
      values.push(initial_notes);
      fields.push(`initial_notes = $${values.length}`);
    }
    if (expected_discharge_date !== undefined) {
      values.push(expected_discharge_date || null);
      fields.push(`expected_discharge_date = $${values.length}`);
    }

    if (!fields.length) throw new AppError(400, 'No fields provided for update');

    const result = await pool.query(
      `UPDATE admissions SET ${fields.join(', ')}, updated_at = NOW() WHERE admission_id = $1 RETURNING *`,
      values
    );

    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('admission', $1, 'UPDATE', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admissions/:id
admissionsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM admissions WHERE admission_id = $1 FOR UPDATE', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Admission not found');

    // Check if linked to any bills
    const billCheck = await client.query('SELECT bill_number FROM bills WHERE admission_id = $1', [req.params.id]);
    if (billCheck.rows.length) {
      throw new AppError(409, `Cannot delete admission linked to invoice '${billCheck.rows[0].bill_number}'. Please cancel or delete the invoice first.`);
    }

    // If currently Active, release the bed back to Available
    if (existing.rows[0].status === 'Active') {
      await client.query(
        `UPDATE beds SET bed_status = 'Available' WHERE bed_id = $1`,
        [existing.rows[0].bed_id]
      );
    }

    const result = await client.query('DELETE FROM admissions WHERE admission_id = $1 RETURNING *', [req.params.id]);

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values)
       VALUES ('admission', $1, 'DELETE', $2)`,
      [req.params.id, JSON.stringify(existing.rows[0])]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Admission deleted successfully', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export { router as bedsRouter, admissionsRouter };
