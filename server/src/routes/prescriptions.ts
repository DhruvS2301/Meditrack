import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { prescriptionSchema } from '../schemas';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/prescriptions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patient_id, doctor_id, status } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (patient_id) {
      params.push(patient_id);
      conditions.push(`pr.patient_id = $${params.length}`);
    }
    if (doctor_id) {
      params.push(doctor_id);
      conditions.push(`pr.doctor_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`pr.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT pr.*,
              p.full_name AS patient_name, p.patient_code,
              d.full_name AS doctor_name,
              COUNT(pi.prescription_item_id) AS item_count
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.patient_id
       JOIN doctors d ON pr.doctor_id = d.doctor_id
       LEFT JOIN prescription_items pi ON pi.prescription_id = pr.prescription_id
       ${where}
       GROUP BY pr.prescription_id, p.full_name, p.patient_code, d.full_name
       ORDER BY pr.prescription_date DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/prescriptions/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pr = await pool.query(
      `SELECT pr.*,
              p.full_name AS patient_name, p.patient_code, p.date_of_birth, p.blood_group,
              d.full_name AS doctor_name, d.specialisation, d.qualification,
              dept.department_name
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.patient_id
       JOIN doctors d ON pr.doctor_id = d.doctor_id
       LEFT JOIN appointments a ON pr.appointment_id = a.appointment_id
       LEFT JOIN departments dept ON a.department_id = dept.department_id
       WHERE pr.prescription_id = $1`,
      [req.params.id]
    );
    if (!pr.rows.length) throw new AppError(404, 'Prescription not found');

    const items = await pool.query(
      `SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY prescription_item_id`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...pr.rows[0], items: items.rows } });
  } catch (err) {
    next(err);
  }
});

// POST /api/prescriptions
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const data = prescriptionSchema.parse(req.body);
    await client.query('BEGIN');

    const pr = await client.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, prescription_date, notes)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [data.patient_id, data.doctor_id, data.appointment_id, data.prescription_date, data.notes]
    );

    for (const item of data.items) {
      await client.query(
        `INSERT INTO prescription_items
           (prescription_id, medicine_name, dosage_instructions, route, frequency, duration, quantity, additional_instructions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [pr.rows[0].prescription_id, item.medicine_name, item.dosage_instructions,
         item.route, item.frequency, item.duration, item.quantity, item.additional_instructions]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
       VALUES ('prescription', $1, 'INSERT', $2)`,
      [pr.rows[0].prescription_id, JSON.stringify(pr.rows[0])]
    );

    await client.query('COMMIT');

    const full = await pool.query(
      `SELECT pr.*, p.full_name AS patient_name, d.full_name AS doctor_name
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.patient_id
       JOIN doctors d ON pr.doctor_id = d.doctor_id
       WHERE pr.prescription_id = $1`,
      [pr.rows[0].prescription_id]
    );
    const items = await pool.query(
      'SELECT * FROM prescription_items WHERE prescription_id = $1',
      [pr.rows[0].prescription_id]
    );
    res.status(201).json({ success: true, data: { ...full.rows[0], items: items.rows } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PATCH /api/prescriptions/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const pr = await client.query('SELECT * FROM prescriptions WHERE prescription_id = $1', [req.params.id]);
    if (!pr.rows.length) throw new AppError(404, 'Prescription not found');
    if (pr.rows[0].status === 'Finalised') {
      throw new AppError(409, 'Cannot edit a finalised prescription');
    }

    await client.query('BEGIN');

    const { notes, prescription_date, items } = req.body;
    const fields: string[] = [];
    const values: unknown[] = [req.params.id];

    if (notes !== undefined) {
      values.push(notes);
      fields.push(`notes = $${values.length}`);
    }
    if (prescription_date !== undefined) {
      values.push(prescription_date);
      fields.push(`prescription_date = $${values.length}`);
    }

    if (fields.length) {
      await client.query(
        `UPDATE prescriptions SET ${fields.join(', ')}, updated_at = NOW() WHERE prescription_id = $1`,
        values
      );
    }

    // If new items are provided for Draft prescription, replace items
    if (Array.isArray(items) && items.length > 0) {
      await client.query('DELETE FROM prescription_items WHERE prescription_id = $1', [req.params.id]);
      for (const item of items) {
        await client.query(
          `INSERT INTO prescription_items
             (prescription_id, medicine_name, dosage_instructions, route, frequency, duration, quantity, additional_instructions)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [req.params.id, item.medicine_name, item.dosage_instructions,
           item.route || null, item.frequency, item.duration, item.quantity, item.additional_instructions || null]
        );
      }
    }

    const updated = await client.query('SELECT * FROM prescriptions WHERE prescription_id = $1', [req.params.id]);
    const updatedItems = await client.query('SELECT * FROM prescription_items WHERE prescription_id = $1', [req.params.id]);

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('prescription', $1, 'UPDATE', $2, $3)`,
      [req.params.id, JSON.stringify(pr.rows[0]), JSON.stringify(updated.rows[0])]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: { ...updated.rows[0], items: updatedItems.rows } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/prescriptions/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const pr = await client.query('SELECT * FROM prescriptions WHERE prescription_id = $1', [req.params.id]);
    if (!pr.rows.length) throw new AppError(404, 'Prescription not found');
    if (pr.rows[0].status === 'Finalised') {
      throw new AppError(409, 'Cannot delete a finalised prescription. Finalised prescriptions are legally locked medical records.');
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM prescription_items WHERE prescription_id = $1', [req.params.id]);
    const result = await client.query('DELETE FROM prescriptions WHERE prescription_id = $1 RETURNING *', [req.params.id]);

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values)
       VALUES ('prescription', $1, 'DELETE', $2)`,
      [req.params.id, JSON.stringify(pr.rows[0])]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Prescription deleted successfully', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/prescriptions/:id/finalise
router.post('/:id/finalise', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pr = await pool.query('SELECT * FROM prescriptions WHERE prescription_id = $1', [req.params.id]);
    if (!pr.rows.length) throw new AppError(404, 'Prescription not found');
    if (pr.rows[0].status === 'Finalised') {
      throw new AppError(409, 'Prescription is already finalised');
    }

    const result = await pool.query(
      `UPDATE prescriptions SET status = 'Finalised', updated_at = NOW() WHERE prescription_id = $1 RETURNING *`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('prescription', $1, 'FINALISE', $2, $3)`,
      [req.params.id, JSON.stringify(pr.rows[0]), JSON.stringify(result.rows[0])]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
