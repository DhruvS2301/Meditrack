import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { billSchema, paymentSchema, paginationSchema } from '../schemas';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/bills
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, sort_order } = paginationSchema.parse(req.query);
    const { status, patient_id } = req.query;
    const offset = (page - 1) * limit;
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.full_name ILIKE $${params.length} OR b.bill_number ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }
    if (patient_id) {
      params.push(patient_id);
      conditions.push(`b.patient_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM bills b JOIN patients p ON b.patient_id = p.patient_id ${where}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT b.*,
              p.full_name AS patient_name, p.patient_code,
              COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'Completed'), 0) AS amount_paid,
              b.total_amount - COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'Completed'), 0) AS outstanding
       FROM bills b
       JOIN patients p ON b.patient_id = p.patient_id
       LEFT JOIN payments pay ON b.bill_id = pay.bill_id
       ${where}
       GROUP BY b.bill_id, p.full_name, p.patient_code
       ORDER BY b.bill_date ${sortDir}
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

// GET /api/bills/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bill = await pool.query(
      `SELECT b.*,
              p.full_name AS patient_name, p.patient_code, p.phone AS patient_phone,
              COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'Completed'), 0) AS amount_paid
       FROM bills b
       JOIN patients p ON b.patient_id = p.patient_id
       LEFT JOIN payments pay ON b.bill_id = pay.bill_id
       WHERE b.bill_id = $1
       GROUP BY b.bill_id, p.full_name, p.patient_code, p.phone`,
      [req.params.id]
    );
    if (!bill.rows.length) throw new AppError(404, 'Bill not found');

    const items = await pool.query(
      'SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY bill_item_id',
      [req.params.id]
    );
    const payments = await pool.query(
      'SELECT * FROM payments WHERE bill_id = $1 ORDER BY payment_date DESC',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...bill.rows[0],
        outstanding: parseFloat(bill.rows[0].total_amount) - parseFloat(bill.rows[0].amount_paid),
        items: items.rows,
        payments: payments.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bills
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const data = billSchema.parse(req.body);
    await client.query('BEGIN');

    // Calculate subtotal from items
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const discount = data.discount_amount || 0;
    const tax = data.tax_amount || 0;
    const total = subtotal - discount + tax;

    if (total < 0) throw new AppError(400, 'Total amount cannot be negative');

    const bill = await client.query(
      `INSERT INTO bills
         (patient_id, appointment_id, admission_id, bill_date, due_date,
          subtotal, discount_amount, tax_amount, total_amount, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [data.patient_id, data.appointment_id, data.admission_id,
       data.bill_date, data.due_date, subtotal, discount, tax, total, data.notes]
    );

    for (const item of data.items) {
      const lineTotal = item.quantity * item.unit_price;
      await client.query(
        `INSERT INTO bill_items (bill_id, description, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5)`,
        [bill.rows[0].bill_id, item.description, item.quantity, item.unit_price, lineTotal]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, new_values)
       VALUES ('bill', $1, 'INSERT', $2)`,
      [bill.rows[0].bill_id, JSON.stringify(bill.rows[0])]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: bill.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PATCH /api/bills/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT * FROM bills WHERE bill_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Bill not found');
    if (existing.rows[0].status === 'Paid') {
      throw new AppError(409, 'Cannot modify a fully paid bill');
    }

    const { status, due_date, notes, discount_amount, tax_amount } = req.body;
    const allowedStatuses = ['Pending', 'Partial', 'Paid', 'Overdue', 'Cancelled'];
    if (status && !allowedStatuses.includes(status)) {
      throw new AppError(400, 'Invalid bill status');
    }

    await client.query('BEGIN');

    const fields: string[] = [];
    const values: unknown[] = [req.params.id];

    if (status !== undefined) {
      values.push(status);
      fields.push(`status = $${values.length}`);
    }
    if (due_date !== undefined) {
      values.push(due_date || null);
      fields.push(`due_date = $${values.length}`);
    }
    if (notes !== undefined) {
      values.push(notes || null);
      fields.push(`notes = $${values.length}`);
    }

    let subtotal = parseFloat(existing.rows[0].subtotal);
    let discount = discount_amount !== undefined ? parseFloat(discount_amount) : parseFloat(existing.rows[0].discount_amount);
    let tax = tax_amount !== undefined ? parseFloat(tax_amount) : parseFloat(existing.rows[0].tax_amount);

    if (discount_amount !== undefined) {
      values.push(discount);
      fields.push(`discount_amount = $${values.length}`);
    }
    if (tax_amount !== undefined) {
      values.push(tax);
      fields.push(`tax_amount = $${values.length}`);
    }

    if (discount_amount !== undefined || tax_amount !== undefined) {
      const newTotal = Math.max(0, subtotal - discount + tax);
      values.push(newTotal);
      fields.push(`total_amount = $${values.length}`);
    }

    if (!fields.length) throw new AppError(400, 'No fields to update');

    const result = await client.query(
      `UPDATE bills SET ${fields.join(', ')}, updated_at = NOW() WHERE bill_id = $1 RETURNING *`,
      values
    );

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, new_values)
       VALUES ('bill', $1, 'UPDATE', $2, $3)`,
      [req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0])]
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

// DELETE /api/bills/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT * FROM bills WHERE bill_id = $1', [req.params.id]);
    if (!existing.rows.length) throw new AppError(404, 'Bill not found');

    const paymentCheck = await client.query(
      `SELECT COUNT(*) FROM payments WHERE bill_id = $1 AND payment_status = 'Completed'`,
      [req.params.id]
    );
    const completedPayments = parseInt(paymentCheck.rows[0].count);
    if (completedPayments > 0) {
      throw new AppError(
        409,
        `Cannot delete bill '${existing.rows[0].bill_number}' because it has ${completedPayments} completed payment(s) recorded. ` +
        `To maintain accounting audit records, update the bill status to 'Cancelled' instead.`
      );
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM payments WHERE bill_id = $1', [req.params.id]);
    await client.query('DELETE FROM bill_items WHERE bill_id = $1', [req.params.id]);
    const result = await client.query('DELETE FROM bills WHERE bill_id = $1 RETURNING *', [req.params.id]);

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values)
       VALUES ('bill', $1, 'DELETE', $2)`,
      [req.params.id, JSON.stringify(existing.rows[0])]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Bill deleted successfully', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/bills/:id/payments
router.get('/:id/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payments WHERE bill_id = $1 ORDER BY payment_date DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/bills/:id/payments
router.post('/:id/payments', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const data = paymentSchema.parse(req.body);
    await client.query('BEGIN');

    const bill = await client.query(
      'SELECT * FROM bills WHERE bill_id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!bill.rows.length) throw new AppError(404, 'Bill not found');
    if (bill.rows[0].status === 'Cancelled') {
      throw new AppError(409, 'Cannot record payment against a cancelled bill');
    }

    // Check overpayment only for Completed payments
    if (data.payment_status === 'Completed') {
      const paidResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments
         WHERE bill_id = $1 AND payment_status = 'Completed'`,
        [req.params.id]
      );
      const alreadyPaid = parseFloat(paidResult.rows[0].paid);
      const total = parseFloat(bill.rows[0].total_amount);
      if (alreadyPaid + data.amount > total + 0.01) {
        throw new AppError(409, `Payment would exceed bill total (outstanding: ${(total - alreadyPaid).toFixed(2)})`);
      }
    }

    const payment = await client.query(
      `INSERT INTO payments
         (bill_id, amount, payment_method, payment_status, transaction_reference, payment_date)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [req.params.id, data.amount, data.payment_method, data.payment_status,
       data.transaction_reference, data.payment_date]
    );

    // Update bill status based on total paid
    if (data.payment_status === 'Completed') {
      const paidTotal = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments
         WHERE bill_id = $1 AND payment_status = 'Completed'`,
        [req.params.id]
      );
      const totalPaid = parseFloat(paidTotal.rows[0].paid);
      const billTotal = parseFloat(bill.rows[0].total_amount);
      const newStatus = totalPaid >= billTotal ? 'Paid' : 'Partial';
      await client.query(
        `UPDATE bills SET status = $2, updated_at = NOW() WHERE bill_id = $1`,
        [req.params.id, newStatus]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: payment.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
