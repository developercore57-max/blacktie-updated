import { Router, type Request, type Response, type NextFunction } from 'express';
import { pool } from '@workspace/db';
import { SEED_STATEMENTS } from '../auto-seed';

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== 'admin') {
    return res.status(401).json({ error: 'Admin access required' });
  }
  next();
}

router.post('/sync-data', requireAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    for (const stmt of SEED_STATEMENTS) {
      await client.query(stmt);
      if (stmt.startsWith('INSERT')) inserted++;
    }
    await client.query('COMMIT');
    return res.json({ success: true, message: `Sync complete. Processed ${inserted} insert statements.` });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Sync error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
