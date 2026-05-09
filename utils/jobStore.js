// In-memory job store (use Redis in production)
const jobs = new Map();

export function createJob(id) {
  jobs.set(id, {
    id,
    status: 'queued',
    progress: 0,
    step: 'Starting...',
    clips: [],
    blogPost: '',
    error: null,
    createdAt: Date.now(),
  });
  return jobs.get(id);
}

export function updateJob(id, updates) {
  const job = jobs.get(id);
  if (!job) return null;
  Object.assign(job, updates);
  return job;
}

export function getJob(id) {
  return jobs.get(id) || null;
}
