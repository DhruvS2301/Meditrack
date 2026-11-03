import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entity_type, entity_id, limit = 50 } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (entity_type) {
      params.push(entity_type);
      conditions.push(`al.entity_type = $${params.length}`);
    }
    if (entity_id) {
      params.push(entity_id);
      conditions.push(`al.entity_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(Math.min(parseInt(String(limit)), 200));
    const result = await pool.query(
      `SELECT al.* FROM audit_logs al
       ${where}
       ORDER BY al.changed_at DESC
       LIMIT $${params.length}`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
