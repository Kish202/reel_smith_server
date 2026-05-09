import express from 'express';
import { getJob } from '../utils/jobStore.js';

const router = express.Router();

router.get('/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

export default router;
