import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].time,
      db_version: result.rows[0].version.split(' ').slice(0, 2).join(' '),
    });
  } catch {
    res.status(503).json({ success: false, status: 'unhealthy', database: 'disconnected' });
  }
});

export default router;
