import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

const router = Router();

function getDateRange(req: Request): { start: string; end: string } {
  const end = String(req.query.date_to || new Date().toISOString().split('T')[0]);
  const start = String(req.query.date_from || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);
  return { start, end };
}

// GET /api/reports/appointments
router.get('/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(req);
    const [byDay, byStatus, completionRate] = await Promise.all([
      pool.query(
        `SELECT DATE(appointment_start) AS day, COUNT(*) AS count
         FROM appointments
         WHERE appointment_start >= $1 AND appointment_start <= $2
         GROUP BY day ORDER BY day`,
        [start, end]
      ),
      pool.query(
        `SELECT status, COUNT(*) AS count
         FROM appointments
         WHERE appointment_start >= $1 AND appointment_start <= $2
         GROUP BY status`,
        [start, end]
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
           COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled,
           COUNT(*) FILTER (WHERE status = 'No Show') AS no_show,
           ROUND(COUNT(*) FILTER (WHERE status = 'Completed') * 100.0 / NULLIF(COUNT(*), 0), 2) AS completion_rate
         FROM appointments
         WHERE appointment_start >= $1 AND appointment_start <= $2`,
        [start, end]
      ),
    ]);
    res.json({ success: true, data: { by_day: byDay.rows, by_status: byStatus.rows, summary: completionRate.rows[0] } });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/doctor-workload
router.get('/doctor-workload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(req);
    const result = await pool.query(
      `SELECT
         d.doctor_id, d.full_name AS doctor_name, d.doctor_code, dept.department_name,
         COUNT(a.appointment_id) AS total_appointments,
         COUNT(a.appointment_id) FILTER (WHERE a.status = 'Completed') AS completed,
         COUNT(a.appointment_id) FILTER (WHERE a.appointment_start > NOW() AND a.status NOT IN ('Cancelled','No Show')) AS upcoming
       FROM doctors d
       LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
         AND a.appointment_start >= $1 AND a.appointment_start <= $2
       LEFT JOIN departments dept ON d.department_id = dept.department_id
       WHERE d.is_active = true
       GROUP BY d.doctor_id, d.full_name, d.doctor_code, dept.department_name
       ORDER BY total_appointments DESC`,
      [start, end]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/departments
router.get('/departments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(req);
    const result = await pool.query(
      `SELECT
         dept.department_id, dept.department_name,
         COUNT(DISTINCT d.doctor_id) FILTER (WHERE d.is_active) AS active_doctors,
         COUNT(DISTINCT a.appointment_id) AS appointments,
         COUNT(DISTINCT adm.admission_id) AS admissions,
         COUNT(DISTINCT b.bed_id) AS total_beds,
         COUNT(DISTINCT b.bed_id) FILTER (WHERE b.bed_status = 'Available') AS available_beds
       FROM departments dept
       LEFT JOIN doctors d ON d.department_id = dept.department_id
       LEFT JOIN appointments a ON a.department_id = dept.department_id
         AND a.appointment_start >= $1 AND a.appointment_start <= $2
       LEFT JOIN admissions adm ON adm.department_id = dept.department_id
         AND adm.admission_datetime >= $1 AND adm.admission_datetime <= $2
       LEFT JOIN beds b ON b.department_id = dept.department_id
       WHERE dept.is_active = true
       GROUP BY dept.department_id, dept.department_name
       ORDER BY appointments DESC`,
      [start, end]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/patient-registrations
router.get('/patient-registrations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(req);
    const [monthly, total] = await Promise.all([
      pool.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', registered_at), 'YYYY-MM') AS month,
           COUNT(*) AS count
         FROM patients
         WHERE registered_at >= $1 AND registered_at <= $2
         GROUP BY DATE_TRUNC('month', registered_at)
         ORDER BY month`,
        [start, end]
      ),
      pool.query('SELECT COUNT(*) FROM patients WHERE is_active = true'),
    ]);
    res.json({ success: true, data: { monthly: monthly.rows, total: parseInt(total.rows[0].count) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/occupancy
router.get('/occupancy', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [overall, byWard, byType] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE bed_status = 'Occupied') AS occupied,
           COUNT(*) FILTER (WHERE bed_status = 'Available') AS available,
           ROUND(COUNT(*) FILTER (WHERE bed_status = 'Occupied') * 100.0 / NULLIF(COUNT(*), 0), 2) AS occupancy_rate
         FROM beds`
      ),
      pool.query(
        `SELECT ward_name, dept.department_name,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE bed_status = 'Occupied') AS occupied,
                COUNT(*) FILTER (WHERE bed_status = 'Available') AS available
         FROM beds b JOIN departments dept ON b.department_id = dept.department_id
         GROUP BY ward_name, dept.department_name ORDER BY ward_name`
      ),
      pool.query(
        `SELECT bed_type,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE bed_status = 'Occupied') AS occupied,
                ROUND(COUNT(*) FILTER (WHERE bed_status = 'Occupied') * 100.0 / NULLIF(COUNT(*), 0), 2) AS occupancy_rate
         FROM beds GROUP BY bed_type ORDER BY bed_type`
      ),
    ]);
    res.json({ success: true, data: { overall: overall.rows[0], by_ward: byWard.rows, by_type: byType.rows } });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/admissions
router.get('/admissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(req);
    const [monthly, stats] = await Promise.all([
      pool.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', admission_datetime), 'YYYY-MM') AS month,
           COUNT(*) AS admissions,
           COUNT(*) FILTER (WHERE status = 'Discharged') AS discharges
         FROM admissions
         WHERE admission_datetime >= $1 AND admission_datetime <= $2
         GROUP BY DATE_TRUNC('month', admission_datetime)
         ORDER BY month`,
        [start, end]
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total_admissions,
           COUNT(*) FILTER (WHERE status = 'Active') AS active_admissions,
           COUNT(*) FILTER (WHERE status = 'Discharged') AS total_discharges,
           ROUND(AVG(EXTRACT(EPOCH FROM COALESCE(discharge_datetime, NOW()) - admission_datetime)/86400), 1) AS avg_stay_days,
           ROUND(MIN(EXTRACT(EPOCH FROM discharge_datetime - admission_datetime)/86400), 1) AS min_stay_days,
           ROUND(MAX(EXTRACT(EPOCH FROM discharge_datetime - admission_datetime)/86400), 1) AS max_stay_days
         FROM admissions
         WHERE admission_datetime >= $1 AND admission_datetime <= $2`,
        [start, end]
      ),
    ]);
    res.json({ success: true, data: { monthly: monthly.rows, stats: stats.rows[0] } });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/revenue
router.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(req);
    const [summary, monthly] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(DISTINCT b.bill_id) AS total_bills,
           COALESCE(SUM(b.total_amount), 0) AS total_billed,
           COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'Completed'), 0) AS total_collected,
           COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('Paid','Cancelled')), 0) AS outstanding
         FROM bills b
         LEFT JOIN payments p ON b.bill_id = p.bill_id
         WHERE b.bill_date >= $1 AND b.bill_date <= $2`,
        [start, end]
      ),
      pool.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM') AS month,
           COALESCE(SUM(amount), 0) AS revenue
         FROM payments
         WHERE payment_status = 'Completed'
           AND payment_date >= $1 AND payment_date <= $2
         GROUP BY DATE_TRUNC('month', payment_date)
         ORDER BY month`,
        [start, end]
      ),
    ]);
    res.json({ success: true, data: { summary: summary.rows[0], monthly: monthly.rows } });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/billing
router.get('/billing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(req);
    const [stats, byMethod, byStatus] = await Promise.all([
      pool.query(
        `SELECT
           ROUND(AVG(total_amount), 2) AS avg_bill,
           MAX(total_amount) AS max_bill,
           MIN(total_amount) AS min_bill,
           COUNT(*) FILTER (WHERE status NOT IN ('Paid','Cancelled')) AS outstanding_count,
           COUNT(*) AS total_bills
         FROM bills WHERE bill_date >= $1 AND bill_date <= $2`,
        [start, end]
      ),
      pool.query(
        `SELECT payment_method, COUNT(*) AS count, SUM(amount) AS total
         FROM payments WHERE payment_status = 'Completed'
           AND payment_date >= $1 AND payment_date <= $2
         GROUP BY payment_method ORDER BY total DESC`,
        [start, end]
      ),
      pool.query(
        `SELECT payment_status, COUNT(*) AS count
         FROM payments WHERE payment_date >= $1 AND payment_date <= $2
         GROUP BY payment_status`,
        [start, end]
      ),
    ]);
    res.json({ success: true, data: { stats: stats.rows[0], by_method: byMethod.rows, by_status: byStatus.rows } });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/prescriptions
router.get('/prescriptions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(req);
    const [byDoctor, monthly] = await Promise.all([
      pool.query(
        `SELECT d.full_name AS doctor_name, dept.department_name,
                COUNT(pr.prescription_id) AS prescription_count,
                COUNT(pi.prescription_item_id) AS item_count
         FROM doctors d
         LEFT JOIN prescriptions pr ON pr.doctor_id = d.doctor_id
           AND pr.prescription_date >= $1 AND pr.prescription_date <= $2
         LEFT JOIN prescription_items pi ON pi.prescription_id = pr.prescription_id
         LEFT JOIN departments dept ON d.department_id = dept.department_id
         WHERE d.is_active = true
         GROUP BY d.doctor_id, d.full_name, dept.department_name
         ORDER BY prescription_count DESC`,
        [start, end]
      ),
      pool.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', prescription_date), 'YYYY-MM') AS month,
           COUNT(*) AS count
         FROM prescriptions
         WHERE prescription_date >= $1 AND prescription_date <= $2
         GROUP BY DATE_TRUNC('month', prescription_date)
         ORDER BY month`,
        [start, end]
      ),
    ]);
    res.json({ success: true, data: { by_doctor: byDoctor.rows, monthly: monthly.rows } });
  } catch (err) {
    next(err);
  }
});

export default router;
