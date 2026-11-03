import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { appointmentSchema, appointmentStatusSchema, paginationSchema } from '../schemas';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/appointments
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, sort_order } = paginationSchema.parse(req.query);
    const { status, doctor_id, department_id, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.full_name ILIKE $${params.length} OR p.patient_code ILIKE $${params.length} OR a.appointment_code ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }
    if (doctor_id) {
      params.push(doctor_id);
      conditions.push(`a.doctor_id = $${params.length}`);
    }
    if (department_id) {
      params.push(department_id);
      conditions.push(`a.department_id = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`a.appointment_start >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`a.appointment_start <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       ${where}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT a.*,
              p.full_name AS patient_name, p.patient_code,
              d.full_name AS doctor_name, d.doctor_code,
              dept.department_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN departments dept ON a.department_id = dept.department_id
       ${where}
       ORDER BY a.appointment_start ${sortDir}
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

// GET /api/appointments/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              p.full_name AS patient_name, p.patient_code, p.phone AS patient_phone,
              d.full_name AS doctor_name, d.doctor_code, d.specialisation,
              dept.department_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN departments dept ON a.department_id = dept.department_id
       WHERE a.appointment_id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) throw new AppError(404, 'Appointment not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = appointmentSchema.parse(req.body);

    // Validate doctor is active
    const doctor = await pool.query(
      'SELECT doctor_id, is_active FROM doctors WHERE doctor_id = $1',
      [data.doctor_id]
    );
    if (!doctor.rows.length) throw new AppError(404, 'Doctor not found');
    if (!doctor.rows[0].is_active) throw new AppError(409, 'Doctor is not active');

    // Validate patient is active
    const patient = await pool.query(
      'SELECT patient_id, is_active FROM patients WHERE patient_id = $1',
      [data.patient_id]
    );
    if (!patient.rows.length) throw new AppError(404, 'Patient not found');
    if (!patient.rows[0].is_active) throw new AppError(409, 'Patient is not active');

    // Validate times
    const start = new Date(data.appointment_start);
    const end = new Date(data.appointment_end);
    if (end <= start) throw new AppError(400, 'Appointment end must be after start time');

    // Check doctor overlap (excluding cancelled/no-show)
    const doctorOverlap = await pool.query(
      `SELECT appointment_id FROM appointments
       WHERE doctor_id = $1
         AND status NOT IN ('Cancelled', 'No Show')
         AND appointment_start < $3
         AND appointment_end > $2`,
      [data.doctor_id, data.appointment_start, data.appointment_end]
    );
    if (doctorOverlap.rows.length) {
      throw new AppError(409, 'Doctor has a conflicting appointment at this time');
    }

    // Check patient overlap
    const patientOverlap = await pool.query(
      `SELECT appointment_id FROM appointments
       WHERE patient_id = $1
         AND status NOT IN ('Cancelled', 'No Show')
         AND appointment_start < $3
         AND appointment_end > $2`,
      [data.patient_id, data.appointment_start, data.appointment_end]
    );
    if (patientOverlap.rows.length) {
      throw new AppError(409, 'Patient has a conflicting appointment at this time');
    }

    const result = await pool.query(
      `INSERT INTO appointments
         (patient_id, doctor_id, department_id, appointment_start, appointment_end, reason, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [data.patient_id, data.doctor_id, data.department_id,
       data.appointment_start, data.appointment_end,
       data.reason, data.notes, data.status || 'Scheduled']
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
       VALUES ('appointment', $1, 'INSERT', $2)`,
      [result.rows[0].appointment_id, JSON.stringify(result.rows[0])]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = appointmentSchema.partial().parse(req.body);
    const existing = await pool.query(
      'SELECT * FROM appointments WHERE appointment_id = $1',
      [req.params.id]
    );
    if (!existing.rows.length) throw new AppError(404, 'Appointment not found');

    const appt = existing.rows[0];
    if (['Cancelled', 'Completed', 'No Show'].includes(appt.status)) {
      throw new AppError(409, 'Cannot modify a completed, cancelled, or no-show appointment');
    }

    // Re-check overlaps if times changed
    if (data.appointment_start || data.appointment_end) {
      const newStart = data.appointment_start || appt.appointment_start;
      const newEnd = data.appointment_end || appt.appointment_end;
      const newDoctor = data.doctor_id || appt.doctor_id;
      const newPatient = data.patient_id || appt.patient_id;

      if (new Date(newEnd) <= new Date(newStart)) {
        throw new AppError(400, 'Appointment end must be after start time');
      }

      const doctorOverlap = await pool.query(
        `SELECT appointment_id FROM appointments
         WHERE doctor_id = $1
           AND appointment_id != $2
           AND status NOT IN ('Cancelled', 'No Show')
           AND appointment_start < $4
           AND appointment_end > $3`,
        [newDoctor, req.params.id, newStart, newEnd]
      );
      if (doctorOverlap.rows.length) {
        throw new AppError(409, 'Doctor has a conflicting appointment at this time');
      }

      const patientOverlap = await pool.query(
        `SELECT appointment_id FROM appointments
         WHERE patient_id = $1
           AND appointment_id != $2
           AND status NOT IN ('Cancelled', 'No Show')
           AND appointment_start < $4
           AND appointment_end > $3`,
        [newPatient, req.params.id, newStart, newEnd]
      );
      if (patientOverlap.rows.length) {
        throw new AppError(409, 'Patient has a conflicting appointment at this time');
      }
    }

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) throw new AppError(400, 'No fields to update');
    const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = fields.map(([, v]) => v);

    const result = await pool.query(
      `UPDATE appointments SET ${sets}, updated_at = NOW()
       WHERE appointment_id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('appointment', $1, 'UPDATE', $2, $3)`,
      [req.params.id, JSON.stringify(appt), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = appointmentStatusSchema.parse(req.body);
    const existing = await pool.query(
      'SELECT * FROM appointments WHERE appointment_id = $1',
      [req.params.id]
    );
    if (!existing.rows.length) throw new AppError(404, 'Appointment not found');

    const result = await pool.query(
      `UPDATE appointments SET status = $2, updated_at = NOW()
       WHERE appointment_id = $1 RETURNING *`,
      [req.params.id, status]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('appointment', $1, 'STATUS_CHANGE', $2, $3)`,
      [req.params.id, JSON.stringify({ status: existing.rows[0].status }), JSON.stringify({ status })]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments/:id/cancel
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM appointments WHERE appointment_id = $1',
      [req.params.id]
    );
    if (!existing.rows.length) throw new AppError(404, 'Appointment not found');
    if (existing.rows[0].status === 'Cancelled') {
      throw new AppError(409, 'Appointment is already cancelled');
    }

    const result = await pool.query(
      `UPDATE appointments SET status = 'Cancelled', updated_at = NOW()
       WHERE appointment_id = $1 RETURNING *`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('appointment', $1, 'CANCEL', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM appointments WHERE appointment_id = $1',
      [req.params.id]
    );
    if (!existing.rows.length) throw new AppError(404, 'Appointment not found');

    // Check relationships: prescriptions, bills
    const relationCheck = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM prescriptions WHERE appointment_id = $1) AS rx_count,
         (SELECT COUNT(*) FROM bills WHERE appointment_id = $1) AS bill_count`,
      [req.params.id]
    );

    const { rx_count, bill_count } = relationCheck.rows[0];
    const totalRelations = parseInt(rx_count) + parseInt(bill_count);

    if (totalRelations > 0) {
      throw new AppError(
        409,
        `Cannot delete appointment '${existing.rows[0].appointment_code}' because it has linked clinical records ` +
        `(${rx_count} prescriptions, ${bill_count} bills). To preserve patient history, please cancel the appointment instead.`
      );
    }

    const result = await pool.query(
      'DELETE FROM appointments WHERE appointment_id = $1 RETURNING *',
      [req.params.id]
    );

    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values)
       VALUES ('appointment', $1, 'DELETE', $2)`,
      [req.params.id, JSON.stringify(existing.rows[0])]
    );

    res.json({ success: true, message: 'Appointment deleted successfully', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
