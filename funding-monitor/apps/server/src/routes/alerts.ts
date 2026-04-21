import { Router } from 'express';

const router = Router();

// Placeholder — буде реалізовано пізніше
router.get('/',  (_, res) => res.json({ ok: true, data: [] }));
router.post('/', (_, res) => res.json({ ok: true, data: { created: true } }));

export default router;