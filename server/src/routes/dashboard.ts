import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [patients, todayAppts, completedAppts, admissions, beds, bills, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM patients WHERE is_active = true'),
      pool.query(`SELECT COUNT(*) FROM appointments WHERE DATE(appointment_start AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AND status != 'Cancelled'`),
      pool.query(`SELECT COUNT(*) FROM appointments WHERE status = 'Completed' AND appointment_start >= CURRENT_DATE - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) FROM admissions WHERE status = 'Active'`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE bed_status = 'Available') as available, COUNT(*) as total FROM beds`),
      pool.query(`SELECT COUNT(*) FROM bills WHERE status NOT IN ('Paid', 'Cancelled')`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'Completed' AND payment_date >= CURRENT_DATE - INTERVAL '30 days'`),
    ]);

    res.json({
      success: true,
      data: {
        total_patients: parseInt(patients.rows[0].count),
        todays_appointments: parseInt(todayAppts.rows[0].count),
        completed_appointments_30d: parseInt(completedAppts.rows[0].count),
        active_admissions: parseInt(admissions.rows[0].count),
        available_beds: parseInt(beds.rows[0].available),
        total_beds: parseInt(beds.rows[0].total),
        pending_bills: parseInt(bills.rows[0].count),
        revenue_30d: parseFloat(revenue.rows[0].total),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/appointments
router.get('/appointments', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.appointment_id,
        a.appointment_code,
        a.appointment_start,
        a.appointment_end,
        a.reason,
        a.status,
        p.full_name AS patient_name,
        p.patient_code,
        d.full_name AS doctor_name,
        dept.department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN doctors d ON a.doctor_id = d.doctor_id
      JOIN departments dept ON a.department_id = dept.department_id
      WHERE DATE(a.appointment_start AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
      ORDER BY a.appointment_start ASC
      LIMIT 50
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/occupancy
router.get('/occupancy', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT
        dept.department_name,
        COUNT(b.bed_id) AS total_beds,
        COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'Occupied') AS occupied_beds,
        COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'Available') AS available_beds,
        COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'Maintenance') AS maintenance_beds
      FROM departments dept
      LEFT JOIN beds b ON b.department_id = dept.department_id
      WHERE dept.is_active = true
      GROUP BY dept.department_id, dept.department_name
      ORDER BY dept.department_name
    `);
    const overall = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE bed_status = 'Occupied') AS occupied,
        COUNT(*) FILTER (WHERE bed_status = 'Available') AS available,
        COUNT(*) FILTER (WHERE bed_status = 'Maintenance') AS maintenance
      FROM beds
    `);
    res.json({ success: true, data: { by_department: result.rows, overall: overall.rows[0] } });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/revenue
router.get('/revenue', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(b.total_amount), 0) AS total_billed,
        COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'Paid'), 0) AS total_paid,
        COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('Paid', 'Cancelled')), 0) AS outstanding
      FROM bills b
      WHERE b.bill_date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    const monthly = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM') AS month,
        COALESCE(SUM(amount), 0) AS revenue
      FROM payments
      WHERE payment_status = 'Completed'
        AND payment_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', payment_date)
      ORDER BY month
    `);
    res.json({ success: true, data: { summary: result.rows[0], monthly: monthly.rows } });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/department-workload
router.get('/department-workload', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT
        dept.department_name,
        COUNT(a.appointment_id) AS appointment_count,
        COUNT(a.appointment_id) FILTER (WHERE a.status = 'Completed') AS completed_count
      FROM departments dept
      LEFT JOIN appointments a ON a.department_id = dept.department_id
        AND a.appointment_start >= CURRENT_DATE - INTERVAL '30 days'
      WHERE dept.is_active = true
      GROUP BY dept.department_id, dept.department_name
      ORDER BY appointment_count DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
